import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Params, Router } from '@angular/router';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { isWorkspaceDataDestination } from '@app/v1/shared/navigation/workspace-data-destination';
import { FacilityScope, ContextMode, SectionId, facilityScopeQuery } from '@app/v1/routing/workspace-route';
import * as routes from '@app/v1/routing/workspace-route';
import { WorkspaceContextService } from './workspace-context.service';
import { WORKSPACE_SECTIONS } from './primary-rail/workspace-sections';
import { PanelTabId, SUPPORT_PANEL_TABS, buildWorkspacePanelContent } from './support-panel/workspace-support-panel.view';

const DEFAULT_PANEL_TAB: PanelTabId = 'help';
const ACCOUNT_DATA_DETAILS = new Set(['portfolio', 'custom-grid-factors', 'custom-fuels', 'custom-gwps']);
const ACCOUNT_SETTINGS_DETAILS = new Set(['profile', 'units', 'goals', 'financial', 'data-validation', 'backup', 'portfolio', 'delete']);
const FACILITY_SETTINGS_DETAILS = new Set(['profile', 'units', 'goals', 'financial', 'data-validation', 'backup', 'delete']);

/** Guarded navigation commands and the stable shell-facing facade. */
@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationService {
  private readonly router = inject(Router);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly status = inject(WorkspaceStatusService);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly context = inject(WorkspaceContextService);
  private readonly currentUrl = this.context.currentUrl;
  private readonly activePanelTabState = signal<PanelTabId>(DEFAULT_PANEL_TAB);

  readonly sections = computed(() => WORKSPACE_SECTIONS.map(section => ({
    ...section,
    enabled: section.id === 'settings' || section.id === 'data' || section.id === 'analysis' || section.id === 'reports' || section.id === 'imports'
      ? this.isWorkspaceRoute()
      : section.enabled
  })));
  readonly panelTabs = signal(SUPPORT_PANEL_TABS).asReadonly();
  readonly isSupportPanelOpen = signal(true);
  readonly supportPanelRequested = signal(false);
  readonly activePanelTab = this.activePanelTabState.asReadonly();
  readonly dataCheckState = this.status.state;
  private readonly todosFocusRequest = signal(false);
  readonly todosFocusRequested = this.todosFocusRequest.asReadonly();

  readonly routeState = this.context.routeState;
  readonly routeMotion = this.context.routeMotion;
  readonly routeMotionKey = this.context.routeMotionKey;
  readonly isWorkspaceRoute = this.context.isWorkspaceRoute;
  readonly contextMode = this.context.contextMode;
  readonly activeSection = this.context.activeSection;
  readonly activeDetail = this.context.activeDetail;
  readonly activePortfolioTab = this.context.activePortfolioTab;
  readonly activeMeterGuid = this.context.activeMeterGuid;
  readonly activeMeterGroupGuid = this.context.activeMeterGroupGuid;
  readonly activeEnergyUseGroupGuid = this.context.activeEnergyUseGroupGuid;
  readonly activeEnergyUseGuid = this.context.activeEnergyUseGuid;
  readonly activePredictorGuid = this.context.activePredictorGuid;
  readonly activeWeatherPredictorGroupKey = this.context.activeWeatherPredictorGroupKey;
  readonly activeReportGuid = this.context.activeReportGuid;
  readonly activeAnalysisGuid = this.context.activeAnalysisGuid;
  readonly activeAnalysisGroupGuid = this.context.activeAnalysisGroupGuid;
  readonly activeAnalysisStageScope = this.context.activeAnalysisStageScope;
  readonly activeAccountAnalysisStageScope = this.context.activeAccountAnalysisStageScope;
  readonly activeAccountAnalysisResultTab = this.context.activeAccountAnalysisResultTab;
  readonly activeImportFileId = this.context.activeImportFileId;
  readonly activeImportStep = this.context.activeImportStep;
  readonly account = this.context.account;
  readonly facilities = this.context.facilities;
  readonly facility = this.context.facility;
  readonly singleSiteWorkspaceState = this.context.singleSiteWorkspaceState;
  readonly singleFacilityContext = this.context.singleFacilityContext;
  readonly isSingleSiteWorkspace = this.context.isSingleSiteWorkspace;
  readonly hasSingleSiteRecovery = this.context.hasSingleSiteRecovery;
  readonly scopeAvailability = this.context.scopeAvailability;
  readonly inventoryScope = this.context.inventoryScope;
  readonly inventoryFacilityGuid = this.context.inventoryFacilityGuid;
  readonly headerScope = this.context.headerScope;
  readonly headerFacility = this.context.headerFacility;
  readonly inventoryScopeQuery = this.context.inventoryScopeQuery;
  readonly effectiveScope = this.context.effectiveScope;
  readonly contextFacility = this.context.contextFacility;
  readonly contextMeters = this.context.contextMeters;
  readonly contextMeterGroups = this.context.contextMeterGroups;
  readonly contextEnergyUseGroups = this.context.contextEnergyUseGroups;
  readonly contextEnergyUses = this.context.contextEnergyUses;
  readonly contextPredictors = this.context.contextPredictors;
  readonly contextPredictorData = this.context.contextPredictorData;
  readonly contextAnalyses = this.context.contextAnalyses;
  readonly contextReports = this.context.contextReports;
  readonly contextCounts = this.context.contextCounts;

  readonly scopeChangePending = signal(false);
  readonly scopeNotice = signal('');
  readonly uploadQuery = computed(() => ({ ...(isWorkspaceDataDestination(this.routeState()) ? { returnUrl: this.currentUrl() } : {}),
    ...(this.contextFacility() ? { facilityGuid: this.contextFacility()!.guid } : {}) }));
  readonly panelContent = computed(() => buildWorkspacePanelContent({
    account: this.account(), facility: this.contextFacility(), singleFacility: this.singleFacilityContext(),
    counts: this.contextCounts(), route: this.routeState(), activePanelTab: this.activePanelTab(),
    accountTodos: this.status.accountTodos(), discardedItems: this.status.discardedItems()
  }));

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

  readonly isAccountInventory = routes.isAccountInventory;

  async changeFacilityScope(scope: FacilityScope, dataInventory?: 'meters' | 'predictors' | 'energy-uses'): Promise<boolean> {
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
      const tab = state.portfolioTab ?? (state.detail === 'energy-uses' ? 'energy-uses' : state.detail === 'predictors' ? 'predictors'
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
        && !this.activeWeatherPredictorGroupKey() && !this.activeMeterGroupGuid() && !this.activeEnergyUseGuid() && !this.activeEnergyUseGroupGuid()) {
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
    return this.accountPortfolioRoute(accountGuid, detail === 'energy-uses' ? 'energy-uses' : detail === 'predictors' ? 'predictors'
      : detail === 'meters' || detail === 'meter-grouping' ? 'meters' : 'facilities');
  }

  facilityInventoryLink(facilityGuid: string, resource: 'meters' | 'predictors' | 'energy-uses' | 'analysis' | 'reports'): { route: string[]; queryParams?: Params } {
    const accountGuid = this.workspace.account()?.guid ?? '';
    return { route: resource === 'analysis' ? this.accountAnalysisRoute(accountGuid)
      : resource === 'reports' ? this.accountReportsRoute(accountGuid) : this.accountPortfolioRoute(accountGuid, resource),
      queryParams: this.isSingleSiteWorkspace() ? {} : { facility: facilityGuid } };
  }

  async openFacilityInventory(facilityGuid: string, resource: 'meters' | 'predictors' | 'energy-uses' | 'analysis' | 'reports'): Promise<boolean> {
    const link = this.facilityInventoryLink(facilityGuid, resource);
    return this.navigateScopeDestination(link.route, link.queryParams);
  }

  readonly contextNavigationError = signal('');

  setPanelTab(panelTab: PanelTabId): void {
    this.todosFocusRequest.set(false);
    this.activePanelTabState.set(panelTab);
    this.isSupportPanelOpen.set(true);
    this.supportPanelRequested.set(true);
  }

  openTodos(): void {
    this.setPanelTab('todos');
    this.todosFocusRequest.set(true);
  }

  completeTodosFocus(): void {
    this.todosFocusRequest.set(false);
  }

  toggleSupportPanel(visible = this.isSupportPanelOpen()): void {
    this.todosFocusRequest.set(false);
    this.isSupportPanelOpen.set(!visible);
    this.supportPanelRequested.set(this.isSupportPanelOpen());
  }

  hideSupportPanel(): void {
    this.todosFocusRequest.set(false);
    this.isSupportPanelOpen.set(false);
    this.supportPanelRequested.set(false);
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

  readonly accountRoute = routes.accountRoute;
  readonly accountSettingsRoute = routes.accountSettingsRoute;
  readonly accountDataRoute = routes.accountDataRoute;
  readonly accountPortfolioRoute = routes.accountPortfolioRoute;
  readonly accountImportsRoute = routes.accountImportsRoute;
  readonly accountReportsRoute = routes.accountReportsRoute;
  readonly accountReportWorkbenchRoute = routes.accountReportWorkbenchRoute;
  readonly facilityReportWorkbenchRoute = routes.facilityReportWorkbenchRoute;
  readonly accountAnalysisRoute = routes.accountAnalysisRoute;
  readonly accountAnalysisWorkbenchRoute = routes.accountAnalysisWorkbenchRoute;
  readonly accountAnalysisResultsRoute = routes.accountAnalysisResultsRoute;
  readonly facilityRoute = routes.facilityRoute;
  readonly facilityDataToolRoute = routes.facilityDataToolRoute;
  readonly facilityAnalysisWorkbenchRoute = routes.facilityAnalysisWorkbenchRoute;
  readonly facilityAnalysisGroupRoute = routes.facilityAnalysisGroupRoute;
  readonly facilityAnalysisResultsRoute = routes.facilityAnalysisResultsRoute;
  readonly facilityMeterRoute = routes.facilityMeterRoute;
  readonly facilityMeterGroupRoute = routes.facilityMeterGroupRoute;
  readonly facilityEnergyUseRoute = routes.facilityEnergyUseRoute;
  readonly facilityPredictorRoute = routes.facilityPredictorRoute;
  readonly facilityWeatherPredictorCreateRoute = routes.facilityWeatherPredictorCreateRoute;
  readonly facilityWeatherPredictorRoute = routes.facilityWeatherPredictorRoute;
  readonly facilityWeatherPredictorQualityRoute = routes.facilityWeatherPredictorQualityRoute;

  facilitySettingsRoute(facilityGuid: string, detail = 'profile'): Array<string> {
    if (detail === 'backup' && this.singleFacilityContext()?.guid === facilityGuid) return this.accountSettingsRoute(this.workspace.account()!.guid, 'backup');
    return routes.facilitySettingsRoute(facilityGuid, detail);
  }

  private accountRouteForSection(accountGuid: string, section: SectionId, detail: string): Array<string> {
    if (section === 'settings') {
      return this.accountSettingsRoute(accountGuid, this.resolveAccountSettingsDetail(detail));
    }
    if (section === 'data') {
      if (detail === 'energy-uses') return this.accountPortfolioRoute(accountGuid, 'energy-uses');
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
    if (section === 'data') return ['meter-grouping', 'custom-grid-factors', 'custom-fuels', 'custom-gwps'].includes(detail)
      ? { route: this.facilityDataToolRoute(facilityGuid, detail) }
      : this.facilityInventoryLink(facilityGuid, detail === 'energy-uses' ? 'energy-uses' : detail === 'predictors' ? 'predictors' : 'meters');
    if (section === 'imports' && this.account()) return { route: this.accountImportsRoute(this.account()!.guid) };
    return { route: this.facilityRoute(facilityGuid) };
  }

  private resolveAccountDataDetail(detail: string): string {
    return ACCOUNT_DATA_DETAILS.has(detail) ? detail : 'portfolio';
  }

  private resolveAccountSettingsDetail(detail: string): string {
    if (detail === 'staleness') return 'data-validation';
    return ACCOUNT_SETTINGS_DETAILS.has(detail) ? detail : 'profile';
  }

  private resolveFacilitySettingsDetail(detail: string): string {
    if (detail === 'staleness') return 'data-validation';
    return FACILITY_SETTINGS_DETAILS.has(detail) ? detail : 'profile';
  }

  legacyFacilityManagementRoute(accountGuid?: string): Array<string> {
    const guid = accountGuid || this.account()?.guid || this.routeState().accountGuid;
    return routes.legacyFacilityManagementRoute(guid);
  }
}
