import { singleFacilityPresentation } from '@app/v1/shared/navigation/single-facility-presentation';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Params, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { StatusItem, isDataFinding } from '@app/v1/status/status.models';
import type { NavigationMotion } from '@app/v1/shared/navigation/navigation-motion/navigation-motion.directive';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { isWorkspaceDataDestination } from '@app/v1/shared/navigation/workspace-data-destination';
import type { ReportStageId } from '@app/v1/reports/report-workbench.models';

import { ALL_FACILITIES, FacilityScope, facilityScopeQuery } from './facility-scope.models';

export type ContextMode = 'account' | 'facility';
export type WorkspaceRouteMotion = NavigationMotion;
export type SectionId = 'home' | 'data' | 'visualization' | 'analysis' | 'reports' | 'settings' | 'imports';
export type FacilityMeterRouteTab = 'settings' | 'readings' | 'bill-inspection' | 'monthly' | 'monthly-chart' | 'yearly' | 'quality';
export type FacilityMeterGroupRouteTab = 'monthly-table' | 'monthly-chart' | 'yearly';
export type FacilityPredictorRouteTab = 'settings' | 'readings' | 'quality';
export type FacilityWeatherPredictorRouteTab = 'setup' | 'readings' | 'quality';
export type FacilityAnalysisRouteTab = 'setup' | 'used-by';
export type FacilityAnalysisGroupRouteTab = 'setup' | 'banking' | 'regression' | 'annual' | 'monthly-table' | 'monthly-chart';
export type FacilityAnalysisResultRouteTab = 'annual' | 'monthly-table' | 'monthly-chart' | 'group-contributions';
export type AccountAnalysisRouteTab = 'setup' | 'select-items' | 'used-by';
export type AccountAnalysisResultRouteTab = 'annual' | 'monthly-table' | 'monthly-chart' | 'facility-details' | 'facility-contributions';
export type AccountAnalysisStageScope = 'setup' | 'select-items' | 'results' | 'used-by';
export type AccountPortfolioTab = 'facilities' | 'meters' | 'predictors' | 'energy-uses';
export type PanelTabId = 'help' | 'todos' | 'results' | 'details';
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type FacilityAnalysisStageScope = 'analysis' | 'group' | 'facility' | 'used-by';

export interface SectionDefinition {
  readonly id: SectionId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: IconName;
  readonly enabled: boolean;
}

export interface PanelTab {
  readonly id: PanelTabId;
  readonly label: string;
  readonly icon: IconName;
}

export interface WorkspaceInventoryCounts {
  readonly facilities: number;
  readonly meters: number;
  readonly predictors: number;
  readonly analyses: number;
  readonly reports: number;
}

export interface PanelContent {
  readonly help: ReadonlyArray<string>;
  readonly todos: ReadonlyArray<StatusItem>;
  readonly discardedWarnings: ReadonlyArray<StatusItem>;
  readonly results: ReadonlyArray<{ label: string; value: string; tone: StatusTone }>;
  readonly details: ReadonlyArray<{ label: string; value: string }>;
}

export type SingleSiteWorkspaceState = 'portfolio' | 'valid' | 'missing-facility' | 'multiple-facilities';

export interface RouteState {
  readonly portfolioTab?: AccountPortfolioTab;
  readonly view: 'welcome' | 'workspace';
  readonly contextMode: ContextMode;
  readonly accountGuid?: string;
  readonly facilityGuid?: string;
  readonly meterGuid?: string;
  readonly meterGroupGuid?: string;
  readonly predictorGuid?: string;
  readonly weatherPredictorGroupKey?: string;
  readonly reportGuid?: string;
  readonly reportStage?: 'setup' | 'data-checks' | 'report';
  readonly analysisGuid?: string;
  readonly analysisGroupGuid?: string;
  readonly analysisStageScope?: FacilityAnalysisStageScope;
  readonly accountAnalysisStageScope?: AccountAnalysisStageScope;
  readonly accountAnalysisResultTab?: AccountAnalysisResultRouteTab;
  readonly importFileId?: string;
  readonly importStep?: string;
  readonly section: SectionId;
  readonly detail: string;
}

export const WORKSPACE_SECTIONS: ReadonlyArray<SectionDefinition> = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: 'home', enabled: true },
  { id: 'data', label: 'Data', shortLabel: 'Data', icon: 'database', enabled: false },
  { id: 'visualization', label: 'Visualization', shortLabel: 'Visuals', icon: 'dataVisualization', enabled: false },
  { id: 'analysis', label: 'Analysis', shortLabel: 'Analysis', icon: 'analysis', enabled: false },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: 'reports', enabled: false },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: 'settings', enabled: true },
  { id: 'imports', label: 'Upload', shortLabel: 'Upload', icon: 'uploadData', enabled: true }
];

export const SUPPORT_PANEL_TABS: ReadonlyArray<PanelTab> = [
  { id: 'help', label: 'Help', icon: 'help' },
  { id: 'todos', label: 'Todos', icon: 'checklist' },
  { id: 'results', label: 'Results', icon: 'meter' },
  { id: 'details', label: 'Details', icon: 'table' }
];

const DEFAULT_PANEL_TAB: PanelTabId = 'help';
const VALID_SECTION_IDS: ReadonlyArray<SectionId> = ['home', 'data', 'visualization', 'analysis', 'reports', 'settings', 'imports'];
const DEFAULT_DETAILS: Record<SectionId, string> = {
  home: 'overview',
  data: 'portfolio',
  visualization: 'time-series',
  analysis: 'dashboard',
  reports: 'dashboard',
  settings: 'profile',
  imports: 'upload'
};
const DEFAULT_FACILITY_DETAILS: Record<SectionId, string> = {
  ...DEFAULT_DETAILS,
  data: 'meters'
};
const ACCOUNT_DATA_DETAILS = new Set(['portfolio', 'custom-grid-factors', 'custom-fuels', 'custom-gwps']);
const ACCOUNT_SETTINGS_DETAILS = new Set(['profile', 'units', 'goals', 'financial', 'data-validation', 'backup', 'portfolio', 'delete']);
const FACILITY_SETTINGS_DETAILS = new Set(['profile', 'units', 'goals', 'financial', 'data-validation', 'backup', 'delete']);

@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly status = inject(WorkspaceStatusService);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly currentUrl = signal(this.router.url);
  private readonly previousUrl = signal(this.router.url);
  private readonly activePanelTabState = signal<PanelTabId>(DEFAULT_PANEL_TAB);

  readonly sections = computed(() => WORKSPACE_SECTIONS.map(section => ({
    ...section,
    enabled: section.id === 'settings' || section.id === 'data' || section.id === 'analysis' || section.id === 'reports' || section.id === 'imports'
      ? this.isWorkspaceRoute()
      : section.enabled
  })));
  readonly panelTabs = signal(SUPPORT_PANEL_TABS).asReadonly();
  readonly isSupportPanelOpen = signal(true);
  readonly activePanelTab = this.activePanelTabState.asReadonly();

  readonly routeState = computed(() => parseWorkspaceRoute(this.currentUrl()));
  readonly routeMotion = computed(() => this.resolveRouteMotion());
  readonly routeMotionKey = this.currentUrl.asReadonly();
  readonly isWorkspaceRoute = computed(() => this.routeState().view === 'workspace');
  readonly contextMode = computed(() => this.routeState().contextMode);
  readonly activeSection = computed(() => this.routeState().section);
  readonly activeDetail = computed(() => this.routeState().detail);
  readonly activePortfolioTab = computed(() => this.routeState().portfolioTab);
  readonly activeMeterGuid = computed(() => this.routeState().meterGuid);
  readonly activeMeterGroupGuid = computed(() => this.routeState().meterGroupGuid);
  readonly activePredictorGuid = computed(() => this.routeState().predictorGuid);
  readonly activeWeatherPredictorGroupKey = computed(() => this.routeState().weatherPredictorGroupKey);
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
  readonly scopeChangePending = signal(false);
  readonly scopeNotice = signal('');
  readonly scopeAvailability = computed(() => this.workspace.status() === 'ready'
    ? this.facilities().length ? '' : 'No facilities are available in this account.'
    : this.workspace.status() === 'error' ? 'Facilities are unavailable. Retry loading the account.' : 'Loading facilities…');
  readonly inventoryScope = computed<FacilityScope>(() => {
    const state = this.routeState();
    if (!this.isAccountInventory(state) || this.workspace.status() !== 'ready' || state.accountGuid !== this.workspace.account()?.guid) return ALL_FACILITIES;
    if (this.isSingleSiteWorkspace()) return state.section === 'reports' ? ALL_FACILITIES
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
  readonly uploadQuery = computed(() => ({ ...(isWorkspaceDataDestination(this.routeState()) ? { returnUrl: this.currentUrl() } : {}),
    ...(this.contextFacility() ? { facilityGuid: this.contextFacility()!.guid } : {}) }));
  readonly panelContent = computed(() => this.buildPanelContent());

  private inContext(accountGuid: string, facilityGuid: string): boolean {
    return accountGuid === this.workspace.account()?.guid && (!this.contextFacility() || facilityGuid === this.contextFacility()?.guid);
  }

  constructor() {
    effect(() => {
      const state = this.routeState();
      const ready = this.workspace.status() === 'ready';
      const accountGuid = this.workspace.account()?.guid;
      const facilities = this.facilities();
      const url = this.currentUrl();
      if (!ready || state.accountGuid !== accountGuid || !this.isAccountInventory(state)) return;
      const tree = this.router.parseUrl(url);
      const guid = tree.queryParamMap.get('facility');
      if (guid === null || facilities.some(facility => facility.guid === guid && facility.accountId === accountGuid)) return;
      untracked(() => {
        this.scopeNotice.set('The selected facility is unavailable. Showing All facilities.');
        delete tree.queryParams['facility'];
        void this.router.navigateByUrl(tree, { replaceUrl: true }).catch(() => this.contextNavigationError.set('The facility filter could not be updated. Please try again.'));
      });
    });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.previousUrl.set(this.currentUrl());
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  async openAccount(accountGuid: string): Promise<void> {
    if (!this.unsavedChanges.confirmDiscard()) return;
    const result = await this.workspaceService.selectAccount(accountGuid);
    if (result === 'published') {
      await this.router.navigate(this.accountRoute(accountGuid));
    }
  }

  async openWorkspace(accountGuid: string): Promise<void> {
    if (this.activeSection() === 'reports' && this.activeDetail() === 'workbench'
      && !await this.unsavedChanges.flushPendingChanges()) return;
    if (!this.unsavedChanges.confirmDiscard()) return;
    const result = await this.workspaceService.selectAccount(accountGuid);
    if (result !== 'published') {
      return;
    }

    const account = this.workspace.account();
    const facilities = this.workspace.facilities();
    if (account?.isSingleFacilityCompany === true && facilities.length === 1) {
      await this.router.navigate(this.facilityRoute(facilities[0].guid));
      return;
    }

    await this.router.navigate(this.accountRoute(accountGuid));
  }

  async openFacility(facilityGuid: string): Promise<void> {
    await this.navigateScopeDestination(this.facilityRoute(facilityGuid));
  }

  async openAccountData(accountGuid: string): Promise<void> {
    if (!this.unsavedChanges.confirmDiscard()) return;
    const result = await this.workspaceService.selectAccount(accountGuid);
    if (result === 'published') {
      await this.router.navigate(this.accountDataRoute(accountGuid));
    }
  }

  async showWelcome(): Promise<void> {
    await this.navigateScopeDestination(['/v1']);
  }

  isAccountInventory(state: RouteState): boolean {
    return state.contextMode === 'account' && ((state.section === 'data' && state.detail === 'portfolio')
      || ((state.section === 'analysis' || state.section === 'reports') && state.detail === 'dashboard'));
  }

  async changeFacilityScope(scope: FacilityScope, dataInventory?: 'meters' | 'predictors'): Promise<boolean> {
    if (this.scopeChangePending() || this.workspace.status() !== 'ready' || this.workspace.hasPending()) return false;
    const account = this.workspace.account();
    if (!account || this.isSingleSiteWorkspace()) return false;
    if (scope.kind === 'facility' && !this.facilities().some(item => item.guid === scope.facilityGuid && item.accountId === account.guid)) return false;
    const state = this.routeState();
    const facilityGuid = scope.kind === 'facility' ? scope.facilityGuid : undefined;
    let route: string[];
    let query = facilityScopeQuery(scope);
    if (dataInventory) {
      route = this.accountPortfolioRoute(account.guid, dataInventory);
    } else if (state.section === 'settings') {
      const detail = facilityGuid ? FACILITY_SETTINGS_DETAILS.has(state.detail) ? state.detail : 'profile'
        : ACCOUNT_SETTINGS_DETAILS.has(state.detail) ? state.detail : 'profile';
      route = facilityGuid ? this.facilitySettingsRoute(facilityGuid, detail) : this.accountSettingsRoute(account.guid, detail);
      query = {};
    } else if (state.section === 'data' && state.detail === 'meter-grouping' && !state.meterGroupGuid && facilityGuid) {
      route = this.facilityDataToolRoute(facilityGuid, 'meter-grouping'); query = {};
    } else if (state.section === 'analysis') route = this.accountAnalysisRoute(account.guid);
    else if (state.section === 'reports') route = this.accountReportsRoute(account.guid);
    else if (state.portfolioTab === 'facilities' && facilityGuid) route = this.accountPortfolioRoute(account.guid, 'meters');
    else {
      const tab = state.portfolioTab ?? (state.detail === 'predictors' ? 'predictors'
        : state.detail === 'meters' || state.detail === 'meter-grouping' ? 'meters' : 'facilities');
      route = this.accountPortfolioRoute(account.guid, tab);
    }
    return this.navigateScopeDestination(route, query);
  }

  private async navigateScopeDestination(route: string[], queryParams?: Params): Promise<boolean> {
    if (this.scopeChangePending() || this.workspace.hasPending()) return false;
    this.scopeChangePending.set(true);
    this.contextNavigationError.set('');
    try {
      // Report leave guards own their save/discard UI; other editors flush before their ordinary leave guard.
      if (!(this.activeSection() === 'reports' && this.activeDetail() === 'workbench')
        && !await this.unsavedChanges.flushPendingChanges()) return false;
      // Query-only transitions can reuse the component without running its leave guard.
      if (this.activeDetail() !== 'workbench' && !this.activeMeterGuid() && !this.activePredictorGuid()
        && !this.activeWeatherPredictorGroupKey() && !this.activeMeterGroupGuid()) {
        if (!this.unsavedChanges.confirmDiscard()) return false;
      }
      const opened = await (queryParams ? this.router.navigate(route, { queryParams }) : this.router.navigate(route));
      if (opened) this.scopeNotice.set('');
      return opened;
    } catch {
      this.contextNavigationError.set('The destination could not be opened. Your current context has been retained.');
      return false;
    } finally { this.scopeChangePending.set(false); }
  }

  async setContext(contextMode: ContextMode): Promise<boolean> {
    const state = this.routeState();
    if (contextMode === 'facility') {
      if (this.hasSingleSiteRecovery() && !this.facilities().some(facility => facility.guid === state.facilityGuid)) return false;
      const facilityGuid = this.facility()?.guid || this.facilities()[0]?.guid;
      if (facilityGuid) {
        const link = this.facilityDestination(facilityGuid, state.section, state.detail);
        return this.navigateScopeDestination(link.route, link.queryParams);
      }
      return false;
    }
    const accountGuid = this.account()?.guid || state.accountGuid;
    if (accountGuid) {
      return this.navigateScopeDestination(this.accountRouteForSection(accountGuid, state.section, state.detail));
    }
    return false;
  }

  async setFacility(facilityGuid: string): Promise<boolean> {
    if (!this.isSingleSiteWorkspace()) {
      return this.changeFacilityScope({ kind: 'facility', facilityGuid });
    }
    if (this.facilities().some(facility => facility.guid === facilityGuid)) {
      const state = this.routeState();
      const link = this.facilityDestination(facilityGuid, state.section, state.detail);
      return this.navigateScopeDestination(link.route, link.queryParams);
    }
    return false;
  }

  accountDataReturnRoute(accountGuid: string): string[] {
    const detail = this.activeDetail();
    return this.accountPortfolioRoute(accountGuid, detail === 'predictors' ? 'predictors'
      : detail === 'meters' || detail === 'meter-grouping' ? 'meters' : 'facilities');
  }

  facilityInventoryLink(facilityGuid: string, resource: 'meters' | 'predictors' | 'analysis' | 'reports'): { route: string[]; queryParams?: Params } {
    const accountGuid = this.workspace.account()?.guid ?? '';
    return { route: resource === 'analysis' ? this.accountAnalysisRoute(accountGuid)
      : resource === 'reports' ? this.accountReportsRoute(accountGuid) : this.accountPortfolioRoute(accountGuid, resource),
      queryParams: this.isSingleSiteWorkspace() ? {} : { facility: facilityGuid } };
  }

  async openFacilityInventory(facilityGuid: string, resource: 'meters' | 'predictors' | 'analysis' | 'reports'): Promise<boolean> {
    const link = this.facilityInventoryLink(facilityGuid, resource);
    return this.navigateScopeDestination(link.route, link.queryParams);
  }

  readonly contextNavigationError = signal('');

  setPanelTab(panelTab: PanelTabId): void {
    this.activePanelTabState.set(panelTab);
    this.isSupportPanelOpen.set(true);
  }

  toggleSupportPanel(): void {
    this.isSupportPanelOpen.update(open => !open);
  }

  hideSupportPanel(): void {
    this.isSupportPanelOpen.set(false);
  }

  async openSection(sectionId: SectionId): Promise<void> {
    const account = this.account();
    if (account && sectionId === 'imports') {
      await this.navigateScopeDestination(this.accountImportsRoute(account.guid), this.uploadQuery());
      return;
    }
    if (account && sectionId === 'settings') {
      const facility = this.contextFacility();
      const detail = this.activeSection() === 'settings' ? this.activeDetail() : 'profile';
      await this.navigateScopeDestination(facility ? this.facilitySettingsRoute(facility.guid, detail) : this.accountSettingsRoute(account.guid, detail));
      return;
    }
    if (['data', 'analysis', 'reports'].includes(sectionId)) {
      const account = this.account();
      if (account) {
        const scope = this.headerScope();
        const route = sectionId === 'data' ? scope.kind === 'facility' ? this.accountPortfolioRoute(account.guid, 'meters') : this.accountDataRoute(account.guid)
          : sectionId === 'analysis' ? this.accountAnalysisRoute(account.guid) : this.accountReportsRoute(account.guid);
        await this.navigateScopeDestination(route, this.isSingleSiteWorkspace() ? {} : facilityScopeQuery(scope));
      }
      return;
    }
    const contextMode = this.contextMode();
    if (sectionId === 'home') {
      await this.setContext(contextMode);
      return;
    }
  }

  accountRoute(accountGuid: string): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview'];
  }

  accountSettingsRoute(accountGuid: string, detail = 'profile'): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'settings', detail];
  }

  accountDataRoute(accountGuid: string, detail = 'portfolio'): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'data', detail];
  }

  accountPortfolioRoute(accountGuid: string, tab: AccountPortfolioTab = 'facilities'): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'data', 'portfolio', tab];
  }

  accountImportsRoute(accountGuid: string): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'imports', 'upload'];
  }

  accountReportsRoute(accountGuid: string): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'reports', 'dashboard'];
  }

  accountReportWorkbenchRoute(accountGuid: string, reportGuid: string, stage: ReportStageId = 'setup'): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'reports', 'workbench', reportGuid, stage];
  }

  facilityReportWorkbenchRoute(facilityGuid: string, reportGuid: string, stage: 'setup' | 'data-checks' | 'report' = 'setup'): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'reports', 'workbench', reportGuid, stage];
  }

  accountAnalysisRoute(accountGuid: string): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'dashboard'];
  }

  accountAnalysisWorkbenchRoute(
    accountGuid: string,
    analysisGuid: string,
    tab: AccountAnalysisRouteTab = 'setup'
  ): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid, tab];
  }

  accountAnalysisResultsRoute(
    accountGuid: string,
    analysisGuid: string,
    tab: AccountAnalysisResultRouteTab = 'annual'
  ): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid, 'results', tab];
  }

  facilityRoute(facilityGuid: string): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
  }

  facilityDataToolRoute(facilityGuid: string, detail: string): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail];
  }

  facilityAnalysisWorkbenchRoute(
    facilityGuid: string,
    analysisGuid: string,
    tab: FacilityAnalysisRouteTab = 'setup'
  ): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, tab];
  }

  facilityAnalysisGroupRoute(
    facilityGuid: string,
    analysisGuid: string,
    groupGuid: string,
    tab: FacilityAnalysisGroupRouteTab = 'setup'
  ): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, 'group', groupGuid, tab];
  }

  facilityAnalysisResultsRoute(
    facilityGuid: string,
    analysisGuid: string,
    tab: FacilityAnalysisResultRouteTab = 'annual'
  ): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, 'facility', tab];
  }

  facilityMeterRoute(facilityGuid: string, meterGuid: string, tab: FacilityMeterRouteTab = 'settings'): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meters', meterGuid, tab];
  }

  facilityMeterGroupRoute(
    facilityGuid: string,
    groupGuid: string,
    tab: FacilityMeterGroupRouteTab = 'monthly-table'
  ): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meter-grouping', groupGuid, tab];
  }

  facilityPredictorRoute(
    facilityGuid: string,
    predictorGuid: string,
    tab: FacilityPredictorRouteTab = 'settings'
  ): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab];
  }

  facilityWeatherPredictorCreateRoute(facilityGuid: string): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', 'weather', 'new'];
  }

  facilityWeatherPredictorRoute(
    facilityGuid: string,
    groupKey: string,
    tab: FacilityWeatherPredictorRouteTab = 'setup'
  ): Array<string> {
    return [
      '/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors',
      'weather', groupKey, tab
    ];
  }

  facilityWeatherPredictorQualityRoute(
    facilityGuid: string,
    groupKey: string,
    predictorGuid: string
  ): Array<string> {
    return [
      ...this.facilityWeatherPredictorRoute(facilityGuid, groupKey, 'quality'),
      predictorGuid
    ];
  }

  facilitySettingsRoute(facilityGuid: string, detail = 'profile'): Array<string> {
    if (detail === 'backup' && this.singleFacilityContext()?.guid === facilityGuid) return this.accountSettingsRoute(this.workspace.account()!.guid, 'backup');
    return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail];
  }

  private accountRouteForSection(accountGuid: string, section: SectionId, detail: string): Array<string> {
    if (section === 'settings') {
      return this.accountSettingsRoute(accountGuid, this.resolveAccountSettingsDetail(detail));
    }
    if (section === 'data') {
      return this.accountDataRoute(accountGuid, this.resolveAccountDataDetail(detail));
    }
    if (section === 'imports') return this.accountImportsRoute(accountGuid);
    if (section === 'reports') return this.accountReportsRoute(accountGuid);
    if (section === 'analysis') return this.accountAnalysisRoute(accountGuid);
    return this.accountRoute(accountGuid);
  }

  private facilityDestination(facilityGuid: string, section: SectionId, detail: string): { route: string[]; queryParams?: Params } {
    if (section === 'settings') return { route: this.facilitySettingsRoute(facilityGuid, this.resolveFacilitySettingsDetail(detail)) };
    if (section === 'analysis' || section === 'reports') return this.facilityInventoryLink(facilityGuid, section);
    if (section === 'data') return ['meter-grouping', 'energy-uses', 'custom-grid-factors', 'custom-fuels', 'custom-gwps'].includes(detail)
      ? { route: this.facilityDataToolRoute(facilityGuid, detail) }
      : this.facilityInventoryLink(facilityGuid, detail === 'predictors' ? 'predictors' : 'meters');
    if (section === 'imports' && this.account()) return { route: this.accountImportsRoute(this.account()!.guid) };
    return { route: this.facilityRoute(facilityGuid) };
  }

  private resolveAccountDataDetail(detail: string): string {
    return ACCOUNT_DATA_DETAILS.has(detail) ? detail : DEFAULT_DETAILS.data;
  }

  private resolveAccountSettingsDetail(detail: string): string {
    if (detail === 'staleness') return 'data-validation';
    return ACCOUNT_SETTINGS_DETAILS.has(detail) ? detail : DEFAULT_DETAILS.settings;
  }

  private resolveFacilitySettingsDetail(detail: string): string {
    if (detail === 'staleness') return 'data-validation';
    return FACILITY_SETTINGS_DETAILS.has(detail) ? detail : DEFAULT_FACILITY_DETAILS.settings;
  }

  legacyFacilityManagementRoute(accountGuid?: string): Array<string> {
    const guid = accountGuid || this.account()?.guid || this.routeState().accountGuid;
    return guid ? ['/data-management', guid, 'facilities'] : ['/manage-accounts'];
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

  private buildPanelContent(): PanelContent {
    const account = this.account();
    const facility = this.contextFacility();
    const single = this.singleFacilityContext();
    const isFacility = !!facility;
    const name = single?.name ?? (isFacility ? facility?.name : account?.name);
    const counts = this.contextCounts();
    const isData = this.activeSection() === 'data';
    const todos = this.status.accountTodos().filter(item => single || !facility || item.entity.facilityGuid === facility.guid);
    const discardedWarnings = this.status.discardedItems().filter(item => single || !facility || item.entity.facilityGuid === facility.guid);
    const help = single
      ? [`Browse data, analyses, and reports for ${single.name}.`, 'Open an item to work with its saved data and settings.']
      : this.activeSection() === 'reports'
      ? ['Use Reports to browse, create, copy, rename, and delete saved reports. Account Reports includes reports from every facility.', 'Open a report name to view its saved configuration. Report-specific settings and previews are coming in later migrations.']
      : isFacility && this.activeSection() === 'data'
      ? this.buildFacilityDataHelp()
      : [
        `Browse data, analyses, and reports for ${name || 'the selected account'}.`,
        'Choose a facility in the header to focus inventories and navigation on its records.'
      ];

    return {
      help,
      todos: isData ? todos.filter(isDataFinding) : todos,
      discardedWarnings: isData ? discardedWarnings.filter(isDataFinding) : discardedWarnings,
      results: [
        ...(!single ? [{ label: 'Facilities', value: String(counts.facilities), tone: 'info' as const }] : []),
        { label: 'Meters', value: String(counts.meters), tone: counts.meters > 0 ? 'success' : 'neutral' },
        { label: 'Predictors', value: String(counts.predictors), tone: counts.predictors > 0 ? 'success' : 'neutral' },
        ...(!isData ? [
          { label: 'Analyses', value: String(counts.analyses), tone: counts.analyses > 0 ? 'success' as const : 'neutral' as const },
          { label: 'Reports', value: String(counts.reports), tone: counts.reports > 0 ? 'success' as const : 'neutral' as const }
        ] : [])
      ],
      details: [
        { label: 'Context', value: single ? 'Single-facility workspace' : isFacility ? 'Facility workspace' : 'Account workspace' },
        { label: 'Active section', value: `${this.activeSection()} / ${this.activeDetail()}` },
        { label: 'Support tab', value: this.activePanelTab() }
      ]
    };
  }

  private resolveRouteMotion(): WorkspaceRouteMotion {
    const previous = parseWorkspaceRoute(this.previousUrl());
    const current = this.routeState();

    const depth = (route: RouteState, url: string): number | undefined => {
      if (route.view !== 'workspace') return undefined;
      if (route.section === 'reports') return route.contextMode === 'account' ? route.reportGuid ? 1 : 0 : route.reportGuid ? 2 : 1;
      if (route.section === 'analysis') return route.contextMode === 'account' ? route.analysisGuid ? 1 : 0 : route.analysisGuid ? 2 : 1;
      if (route.section !== 'data') return undefined;
      if (route.contextMode === 'account') return route.portfolioTab === 'facilities' || route.portfolioTab === 'meters' || route.portfolioTab === 'predictors' ? 0 : undefined;
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
    if (previous.reportGuid !== current.reportGuid || previous.analysisGuid !== current.analysisGuid || previous.meterGuid !== current.meterGuid || previous.meterGroupGuid !== current.meterGroupGuid || previous.predictorGuid !== current.predictorGuid || previous.weatherPredictorGroupKey !== current.weatherPredictorGroupKey) return 'peer';
    return 'none';
  }

  private buildFacilityDataHelp(): ReadonlyArray<string> {
    if (this.activeDetail() === 'meters') {
      return [
        'Use Meters to search facility meters and compare their available monthly energy, water, and cost data.',
        'Open a meter name for its workbench. Use the actions menu for readings, copy, and delete, or Select meters to delete several together.'
      ];
    }
    if (this.activeDetail() === 'meter-grouping') {
      return [
      'Use Meter Grouping to manage groups, drag meter cards between group sections, or use Move meter for keyboard-friendly reassignment.',
        'Open a group to review monthly and yearly result tables or charts. Open a meter card from a group to continue setup, readings, monthly data, yearly data, and quality review in the meter workbench.'
      ];
    }
    return [
      'Facility Data pages organize setup records used by meter analysis, visualization, and reporting workflows.',
      'Use the sidebar to move between meters, meter grouping, predictors, and energy-use setup.'
    ];
  }
}

export function parseWorkspaceRoute(url: string): RouteState {
  const parts = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const v1Index = parts.indexOf('v1');
  const routeParts = v1Index >= 0 ? parts.slice(v1Index + 1) : parts;
  if (routeParts[0] !== 'workspace') {
    return {
      view: 'welcome',
      contextMode: 'account',
      section: 'home',
      detail: 'overview'
    };
  }
  if (routeParts[1] === 'facility') {
    const section = normalizeSection(routeParts[3]);
    const detail = routeParts[4] || DEFAULT_FACILITY_DETAILS[section];
    const isWeatherPredictorRoute = section === 'data'
      && detail === 'predictors'
      && routeParts[5] === 'weather';
    const isAnalysisWorkbenchRoute = section === 'analysis'
      && detail === 'workbench'
      && !!routeParts[5];
    const analysisRouteSegment = isAnalysisWorkbenchRoute ? routeParts[6] : undefined;
    const analysisStageScope: FacilityAnalysisStageScope | undefined = analysisRouteSegment === 'group'
      ? 'group'
      : analysisRouteSegment === 'facility'
        ? 'facility'
        : analysisRouteSegment === 'used-by'
          ? 'used-by'
          : isAnalysisWorkbenchRoute
            ? 'analysis'
            : undefined;
    return {
      view: 'workspace',
      contextMode: 'facility',
      facilityGuid: routeParts[2],
      section,
      detail,
      reportGuid: section === 'reports' && detail === 'workbench' && routeParts[5] ? safeDecodeRoutePart(routeParts[5]) : undefined,
      reportStage: section === 'reports' && detail === 'workbench' && routeParts[5]
        ? routeParts[6] === 'data-checks' || routeParts[6] === 'report' ? routeParts[6] : 'setup' : undefined,
      meterGuid: section === 'data' && detail === 'meters' && routeParts[5]
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      meterGroupGuid: section === 'data' && detail === 'meter-grouping' && routeParts[5]
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      predictorGuid: section === 'data' && detail === 'predictors' && routeParts[5] && !isWeatherPredictorRoute
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      weatherPredictorGroupKey: isWeatherPredictorRoute && routeParts[6] && routeParts[6] !== 'new'
        ? safeDecodeRoutePart(routeParts[6])
        : undefined,
      analysisGuid: section === 'analysis' && detail === 'workbench' && routeParts[5]
        ? safeDecodeRoutePart(routeParts[5])
        : undefined,
      analysisGroupGuid: analysisStageScope === 'group' && routeParts[7]
        ? safeDecodeRoutePart(routeParts[7])
        : undefined,
      analysisStageScope
    };
  }
  const section = normalizeSection(routeParts[3]);
  const isImportFileRoute = section === 'imports' && routeParts[4] === 'file';
  const isAccountAnalysisWorkbenchRoute = section === 'analysis'
    && routeParts[4] === 'workbench'
    && !!routeParts[5];
  const accountAnalysisStageSegment = isAccountAnalysisWorkbenchRoute ? routeParts[6] : undefined;
  const accountAnalysisStageScope: AccountAnalysisStageScope | undefined = accountAnalysisStageSegment === 'select-items'
    ? 'select-items'
    : accountAnalysisStageSegment === 'results'
      ? 'results'
      : accountAnalysisStageSegment === 'used-by'
        ? 'used-by'
        : isAccountAnalysisWorkbenchRoute
          ? 'setup'
          : undefined;
  const accountAnalysisResultTab = accountAnalysisStageScope === 'results'
    && ['annual', 'monthly-table', 'monthly-chart', 'facility-details', 'facility-contributions'].includes(routeParts[7])
      ? routeParts[7] as AccountAnalysisResultRouteTab
      : undefined;
  return {
    view: 'workspace',
    contextMode: 'account',
    accountGuid: routeParts[2],
    portfolioTab: section === 'data' && routeParts[4] === 'portfolio'
      ? (['facilities', 'meters', 'predictors', 'energy-uses'].includes(routeParts[5]) ? routeParts[5] as AccountPortfolioTab : 'facilities')
      : undefined,
    section,
    detail: routeParts[4] || DEFAULT_DETAILS[section],
    reportGuid: section === 'reports' && routeParts[4] === 'workbench' && routeParts[5] ? safeDecodeRoutePart(routeParts[5]) : undefined,
    reportStage: section === 'reports' && routeParts[4] === 'workbench' && routeParts[5]
      ? routeParts[6] === 'data-checks' || routeParts[6] === 'report' ? routeParts[6] : 'setup' : undefined,
    analysisGuid: isAccountAnalysisWorkbenchRoute
      ? safeDecodeRoutePart(routeParts[5])
      : undefined,
    accountAnalysisStageScope,
    accountAnalysisResultTab,
    importFileId: isImportFileRoute && routeParts[5]
      ? safeDecodeRoutePart(routeParts[5])
      : undefined,
    importStep: isImportFileRoute && routeParts[6]
      ? safeDecodeRoutePart(routeParts[6])
      : undefined
  };
}

function normalizeSection(section: string | undefined): SectionId {
  return VALID_SECTION_IDS.includes(section as SectionId) ? section as SectionId : 'home';
}

function safeDecodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
