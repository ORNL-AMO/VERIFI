import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { IdbAccount } from '@data/models/idbModels/account';
import type { IdbFacility } from '@data/models/idbModels/facility';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { singleFacilityPresentation } from '@app/v1/shared/navigation/single-facility-presentation';
import { ALL_FACILITIES, FacilityScope, RouteState, WorkspaceRouteMotion, facilityScopeQuery, isAccountInventory, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import type { SingleSiteWorkspaceState, WorkspaceInventoryCounts } from './workspace-context.models';

/** Accepted route identity and committed workspace projections; never navigates or writes. */
@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly acceptedUrls = signal({ previous: this.router.url, current: this.router.url });
  readonly currentUrl = computed(() => this.acceptedUrls().current);
  readonly previousUrl = computed(() => this.acceptedUrls().previous);

  readonly routeState = computed(() => parseWorkspaceRoute(this.currentUrl()));
  readonly routeMotion = computed(() => this.resolveRouteMotion());
  readonly routeMotionKey = this.currentUrl;
  readonly isWorkspaceRoute = computed(() => this.routeState().view === 'workspace');
  readonly contextMode = computed(() => this.routeState().contextMode);
  readonly activeSection = computed(() => this.routeState().section);
  readonly activeDetail = computed(() => this.routeState().detail);
  readonly activePortfolioTab = computed(() => this.routeState().portfolioTab);
  readonly activeMeterGuid = computed(() => this.routeState().meterGuid);
  readonly activeMeterGroupGuid = computed(() => this.routeState().meterGroupGuid);
  readonly activeEnergyUseGroupGuid = computed(() => this.routeState().energyUseGroupGuid);
  readonly activeEnergyUseGuid = computed(() => this.routeState().energyUseGuid);
  readonly activePredictorGuid = computed(() => this.routeState().predictorGuid);
  readonly activeWeatherPredictorGroupKey = computed(() => this.routeState().weatherPredictorGroupKey);
  readonly activeVisualizationGuid = computed(() => this.routeState().visualizationGuid);
  readonly activeReportGuid = computed(() => this.routeState().reportGuid);
  readonly activeAnalysisGuid = computed(() => this.routeState().analysisGuid);
  readonly activeAnalysisGroupGuid = computed(() => this.routeState().analysisGroupGuid);
  readonly activeAnalysisStageScope = computed(() => this.routeState().analysisStageScope);
  readonly activeAccountAnalysisStageScope = computed(() => this.routeState().accountAnalysisStageScope);
  readonly activeAccountAnalysisResultTab = computed(() => this.routeState().accountAnalysisResultTab);
  readonly activeImportFileId = computed(() => this.routeState().importFileId);
  readonly activeImportStep = computed(() => this.routeState().importStep);
  readonly account = computed(() => this.resolveAccount());
  readonly facilities = computed(() => this.workspace.facilities());
  readonly facility = computed(() => this.resolveFacility());
  readonly singleSiteWorkspaceState = computed(() => this.resolveSingleSiteWorkspaceState());
  readonly singleFacilityContext = computed<IdbFacility | undefined>(() => {
    return singleFacilityPresentation(this.workspace.account(), this.facilities(), this.workspace.status() === 'ready');
  });
  readonly isSingleSiteWorkspace = computed(() => !!this.singleFacilityContext());
  readonly hasSingleSiteRecovery = computed(() => {
    const state = this.singleSiteWorkspaceState();
    return state === 'missing-facility' || state === 'multiple-facilities';
  });
  readonly scopeAvailability = computed(() => this.workspace.status() === 'ready'
    ? this.facilities().length ? '' : 'No facilities are available in this account.'
    : this.workspace.status() === 'error' ? 'Facilities are unavailable. Retry loading the account.' : 'Loading facilities…');
  readonly inventoryScope = computed<FacilityScope>(() => {
    const state = this.routeState();
    if (!isAccountInventory(state) || this.workspace.status() !== 'ready' || state.accountGuid !== this.workspace.account()?.guid) return ALL_FACILITIES;
    if (this.isSingleSiteWorkspace()) return state.section === 'reports' || state.section === 'visualization' ? ALL_FACILITIES
      : { kind: 'facility', facilityGuid: this.singleFacilityContext()!.guid };
    const guid = this.router.parseUrl(this.currentUrl()).queryParamMap.get('facility');
    return guid && this.facilities().some(facility => facility.guid === guid && facility.accountId === state.accountGuid)
      ? { kind: 'facility', facilityGuid: guid } : ALL_FACILITIES;
  });
  readonly inventoryFacilityGuid = computed(() => {
    const scope = this.inventoryScope();
    return scope.kind === 'facility' ? scope.facilityGuid : undefined;
  });
  readonly headerScope = computed<FacilityScope>(() => {
    const state = this.routeState();
    const visualization = state.section === 'visualization' && state.visualizationGuid
      ? this.workspace.savedVisualizations().find(item => item.guid === state.visualizationGuid && item.accountId === state.accountGuid) : undefined;
    if (visualization) return visualization.facilityId ? { kind: 'facility', facilityGuid: visualization.facilityId } : ALL_FACILITIES;
    const facility = this.facilities().find(item => item.guid === state.facilityGuid && item.accountId === this.workspace.account()?.guid);
    if (facility) return { kind: 'facility', facilityGuid: facility.guid };
    if (this.isSingleSiteWorkspace()) return { kind: 'facility', facilityGuid: this.singleFacilityContext()!.guid };
    return this.inventoryScope();
  });
  readonly headerFacility = computed(() => {
    const scope = this.headerScope();
    return scope.kind === 'facility' ? this.facilities().find(facility => facility.guid === scope.facilityGuid) : undefined;
  });
  readonly inventoryScopeQuery = computed(() => facilityScopeQuery(this.inventoryScope()));
  readonly effectiveScope = computed<FacilityScope>(() => this.isSingleSiteWorkspace() && this.contextMode() === 'account' && this.activeSection() === 'reports'
    ? ALL_FACILITIES : this.headerScope());
  readonly contextFacility = computed(() => {
    const scope = this.effectiveScope();
    return scope.kind === 'facility' ? this.facilities().find(facility => facility.guid === scope.facilityGuid) : undefined;
  });
  readonly contextMeters = computed(() => this.workspace.meters().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextMeterGroups = computed(() => this.workspace.meterGroups().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextEnergyUseGroups = computed(() => this.workspace.energyUseGroups().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextEnergyUses = computed(() => this.workspace.energyUseEquipment().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextPredictors = computed(() => this.workspace.predictors().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextPredictorData = computed(() => this.workspace.predictorData().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextAnalyses = computed(() => this.workspace.facilityAnalyses().filter(item => this.inContext(item.accountId, item.facilityId)));
  readonly contextReports = computed(() => this.workspace.facilityReports().filter(item => this.inContext(item.accountId, item.facilityId)));
  /** Named counts are independent of which summary rows the support panel displays. */
  readonly contextCounts = computed<WorkspaceInventoryCounts>(() => {
    const facility = this.contextFacility(), single = this.singleFacilityContext();
    return {
      facilities: facility ? 1 : this.facilities().length,
      meters: this.contextMeters().length,
      predictors: this.contextPredictors().length,
      analyses: this.contextAnalyses().length + (facility || single ? 0 : this.workspace.accountAnalyses().length),
      reports: this.contextReports().length + (facility && !single ? 0 : this.workspace.accountReports().length)
    };
  });

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.acceptedUrls.update(urls => ({
      previous: urls.current, current: event.urlAfterRedirects
    })));
  }

  private inContext(accountGuid: string, facilityGuid: string): boolean {
    return accountGuid === this.workspace.account()?.guid && (!this.contextFacility() || facilityGuid === this.contextFacility()?.guid);
  }

  private resolveAccount(): IdbAccount | undefined {
    const state = this.routeState();
    return this.lifecycle.usableAccounts().find(account => account.guid === state.accountGuid)
      || this.workspace.account()
      || this.lifecycle.usableAccounts()[0];
  }

  private resolveFacility(): IdbFacility | undefined {
    const state = this.routeState();
    if (state.facilityGuid) {
      return this.facilities().find(facility => facility.guid === state.facilityGuid)
        || this.workspace.selectedFacility();
    }
    return this.workspace.selectedFacility() || this.facilities()[0];
  }

  private resolveSingleSiteWorkspaceState(): SingleSiteWorkspaceState {
    const account = this.workspace.account() || this.account();
    if (account?.isSingleFacilityCompany !== true) {
      return 'portfolio';
    }
    const facilityCount = this.facilities().filter(facility => facility.accountId === account.guid).length;
    if (facilityCount === 1) {
      return 'valid';
    }
    return facilityCount === 0 ? 'missing-facility' : 'multiple-facilities';
  }

  private resolveRouteMotion(): WorkspaceRouteMotion {
    const previous = parseWorkspaceRoute(this.previousUrl());
    const current = this.routeState();

    const depth = (route: RouteState, url: string): number | undefined => {
      if (route.view !== 'workspace') return undefined;
      if (route.section === 'visualization') return route.visualizationGuid ? 1 : 0;
      if (route.section === 'reports') return route.contextMode === 'account' ? route.reportGuid ? 1 : 0 : route.reportGuid ? 2 : 1;
      if (route.section === 'analysis') return route.contextMode === 'account' ? route.analysisGuid ? 1 : 0 : route.analysisGuid ? 2 : 1;
      if (route.section !== 'data') return undefined;
      if (route.contextMode === 'account') return route.portfolioTab === 'facilities' || route.portfolioTab === 'meters' || route.portfolioTab === 'predictors' || route.portfolioTab === 'energy-uses' ? 0 : undefined;
      if (route.detail === 'energy-uses') return route.energyUseGroupGuid ? 2 : 1;
      if (route.detail === 'predictors') return route.predictorGuid || route.weatherPredictorGroupKey || url.includes('/predictors/weather/new') ? 2 : 1;
      if (route.detail === 'meter-grouping') return route.meterGroupGuid ? 2 : 1;
      return route.detail === 'meters' ? route.meterGuid ? 2 : 1 : undefined;
    };
    const before = depth(previous, this.previousUrl());
    const after = depth(current, this.currentUrl());
    if (before === undefined || after === undefined || previous.section !== current.section) return 'none';
    const accountFor = (route: RouteState) => route.accountGuid || this.facilities().find(facility => facility.guid === route.facilityGuid)?.accountId;
    const accountGuid = accountFor(current);
    if (!accountGuid || accountGuid !== accountFor(previous)) return 'none';
    if (previous.facilityGuid && current.facilityGuid && previous.facilityGuid !== current.facilityGuid) return 'peer';
    if (after !== before) return after > before ? 'drill-in' : 'drill-out';
    if (previous.visualizationGuid !== current.visualizationGuid || previous.reportGuid !== current.reportGuid || previous.analysisGuid !== current.analysisGuid || previous.meterGuid !== current.meterGuid || previous.meterGroupGuid !== current.meterGroupGuid || previous.energyUseGuid !== current.energyUseGuid || previous.energyUseGroupGuid !== current.energyUseGroupGuid || previous.predictorGuid !== current.predictorGuid || previous.weatherPredictorGroupKey !== current.weatherPredictorGroupKey) return 'peer';
    return 'none';
  }
}
