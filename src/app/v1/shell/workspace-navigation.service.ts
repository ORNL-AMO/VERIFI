import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';

export type ContextMode = 'account' | 'facility';
export type WorkspaceRouteMotion = 'none' | 'workspace-entry' | 'facility-drill-in' | 'account-drill-out';
export type SectionId = 'home' | 'data' | 'visualization' | 'analysis' | 'reports' | 'settings' | 'imports';
export type PanelTabId = 'help' | 'todos' | 'results' | 'details';
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SectionDefinition {
  readonly id: SectionId;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly enabled: boolean;
}

export interface PanelTab {
  readonly id: PanelTabId;
  readonly label: string;
  readonly icon: string;
}

export interface PanelContent {
  readonly help: ReadonlyArray<string>;
  readonly todos: ReadonlyArray<string>;
  readonly results: ReadonlyArray<{ label: string; value: string; tone: StatusTone }>;
  readonly details: ReadonlyArray<{ label: string; value: string }>;
}

interface RouteState {
  readonly view: 'welcome' | 'workspace';
  readonly contextMode: ContextMode;
  readonly accountGuid?: string;
  readonly facilityGuid?: string;
  readonly section: SectionId;
  readonly detail: string;
}

export const WORKSPACE_SECTIONS: ReadonlyArray<SectionDefinition> = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: 'fa-house', enabled: true },
  { id: 'data', label: 'Data', shortLabel: 'Data', icon: 'fa-database', enabled: false },
  { id: 'visualization', label: 'Visualization', shortLabel: 'Visuals', icon: 'fa-chart-line', enabled: false },
  { id: 'analysis', label: 'Analysis', shortLabel: 'Analysis', icon: 'fa-chart-simple', enabled: false },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: 'fa-file-lines', enabled: false },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: 'fa-sliders', enabled: true },
  { id: 'imports', label: 'Imports & Backup', shortLabel: 'Imports', icon: 'fa-file-import', enabled: false }
];

export const SUPPORT_PANEL_TABS: ReadonlyArray<PanelTab> = [
  { id: 'help', label: 'Help', icon: 'fa-circle-question' },
  { id: 'todos', label: 'Todos', icon: 'fa-list-check' },
  { id: 'results', label: 'Results', icon: 'fa-gauge-high' },
  { id: 'details', label: 'Details', icon: 'fa-table-list' }
];

const DEFAULT_PANEL_TAB: PanelTabId = 'help';
const VALID_SECTION_IDS: ReadonlyArray<SectionId> = ['home', 'data', 'visualization', 'analysis', 'reports', 'settings', 'imports'];
const DEFAULT_DETAILS: Record<SectionId, string> = {
  home: 'overview',
  data: 'facilities',
  visualization: 'time-series',
  analysis: 'rollup',
  reports: 'setup',
  settings: 'profile',
  imports: 'template'
};

@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly currentUrl = signal(this.router.url);
  private readonly previousUrl = signal(this.router.url);
  private readonly activePanelTabState = signal<PanelTabId>(DEFAULT_PANEL_TAB);

  readonly sections = computed(() => WORKSPACE_SECTIONS.map(section => ({
    ...section,
    enabled: section.id === 'settings' ? this.isWorkspaceRoute() : section.enabled
  })));
  readonly panelTabs = signal(SUPPORT_PANEL_TABS).asReadonly();
  readonly isSupportPanelOpen = signal(true);
  readonly activePanelTab = this.activePanelTabState.asReadonly();

  readonly routeState = computed(() => parseWorkspaceRoute(this.currentUrl()));
  readonly routeMotion = computed(() => this.resolveRouteMotion());
  readonly isWorkspaceRoute = computed(() => this.routeState().view === 'workspace');
  readonly contextMode = computed(() => this.routeState().contextMode);
  readonly activeSection = computed(() => this.routeState().section);
  readonly activeDetail = computed(() => this.routeState().detail);
  readonly account = computed(() => this.resolveAccount());
  readonly facilities = computed(() => this.workspace.facilities());
  readonly facility = computed(() => this.resolveFacility());
  readonly panelContent = computed(() => this.buildPanelContent());

  constructor() {
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
    const result = await this.workspaceService.selectAccount(accountGuid);
    if (result === 'published') {
      await this.router.navigate(this.accountRoute(accountGuid));
    }
  }

  async openFacility(facilityGuid: string): Promise<void> {
    this.workspaceService.selectFacility(facilityGuid);
    await this.router.navigate(this.facilityRoute(facilityGuid));
  }

  showWelcome(): void {
    void this.router.navigate(['/v1']);
  }

  setContext(contextMode: ContextMode): void {
    if (contextMode === 'facility') {
      const facilityGuid = this.facility()?.guid || this.facilities()[0]?.guid;
      if (facilityGuid) {
        void this.router.navigate(this.facilityRoute(facilityGuid));
      }
      return;
    }
    const state = this.routeState();
    const accountGuid = this.account()?.guid || state.accountGuid;
    if (accountGuid) {
      void this.router.navigate(this.accountRoute(accountGuid));
    }
  }

  setFacility(facilityGuid: string): void {
    this.workspaceService.selectFacility(facilityGuid);
    void this.router.navigate(this.facilityRoute(facilityGuid));
  }

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

  openSection(sectionId: SectionId): void {
    const contextMode = this.contextMode();
    if (sectionId === 'home') {
      this.setContext(contextMode);
      return;
    }
    if (sectionId === 'settings' && contextMode === 'account') {
      const accountGuid = this.account()?.guid || this.routeState().accountGuid;
      if (accountGuid) {
        void this.router.navigate(this.accountSettingsRoute(accountGuid));
      }
      return;
    }
    if (sectionId === 'settings' && contextMode === 'facility') {
      const facilityGuid = this.facility()?.guid || this.routeState().facilityGuid;
      if (facilityGuid) {
        void this.router.navigate(this.facilitySettingsRoute(facilityGuid));
      }
    }
  }

  accountRoute(accountGuid: string): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview'];
  }

  accountSettingsRoute(accountGuid: string, detail = 'profile'): Array<string> {
    return ['/v1', 'workspace', 'account', accountGuid, 'settings', detail];
  }

  facilityRoute(facilityGuid: string): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
  }

  facilitySettingsRoute(facilityGuid: string, detail = 'profile'): Array<string> {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail];
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

  private buildPanelContent(): PanelContent {
    const context = this.contextMode();
    const account = this.account();
    const facility = this.facility();
    const isFacility = context === 'facility';
    const name = isFacility ? facility?.name : account?.name;
    const meterCount = isFacility ? this.workspace.facilityMeters().length : this.workspace.meters().length;
    const predictorCount = isFacility ? this.workspace.facilityPredictors().length : this.workspace.predictors().length;
    const analysisCount = isFacility ? this.workspace.selectedFacilityAnalyses().length : this.workspace.accountAnalyses().length;
    const reportCount = isFacility ? this.workspace.selectedFacilityReports().length : this.workspace.accountReports().length;

    return {
      help: [
        `This v1 Home page is the production shell starter for ${name || 'the selected workspace'}.`,
        'Use the rail and context controls to confirm account and facility navigation before workflow pages are migrated.'
      ],
      todos: [
        isFacility ? 'Review facility setup and migrated workflow readiness.' : this.activeSection() === 'settings' ? 'Confirm account settings before detailed workflows use them.' : 'Review account setup and portfolio readiness.',
        'Data, analysis, reports, and import workflows remain in current VERIFI until their v1 slices are built.'
      ],
      results: [
        { label: 'Facilities', value: String(this.facilities().length), tone: 'info' },
        { label: 'Meters', value: String(meterCount), tone: meterCount > 0 ? 'success' : 'neutral' },
        { label: 'Predictors', value: String(predictorCount), tone: predictorCount > 0 ? 'success' : 'neutral' },
        { label: 'Analyses', value: String(analysisCount), tone: analysisCount > 0 ? 'success' : 'neutral' },
        { label: 'Reports', value: String(reportCount), tone: reportCount > 0 ? 'success' : 'neutral' }
      ],
      details: [
        { label: 'Context', value: isFacility ? 'Facility workspace' : 'Account workspace' },
        { label: 'Active section', value: `${this.activeSection()} / ${this.activeDetail()}` },
        { label: 'Support tab', value: this.activePanelTab() }
      ]
    };
  }

  private resolveRouteMotion(): WorkspaceRouteMotion {
    const previous = parseWorkspaceRoute(this.previousUrl());
    const current = this.routeState();

    if (previous.view === 'welcome' && current.view === 'workspace') {
      return 'workspace-entry';
    }
    if (previous.view === 'workspace' && current.view === 'workspace' && previous.contextMode !== current.contextMode) {
      return current.contextMode === 'facility' ? 'facility-drill-in' : 'account-drill-out';
    }
    return 'none';
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
    return {
      view: 'workspace',
      contextMode: 'facility',
      facilityGuid: routeParts[2],
      section,
      detail: routeParts[4] || DEFAULT_DETAILS[section]
    };
  }
  const section = normalizeSection(routeParts[3]);
  return {
    view: 'workspace',
    contextMode: 'account',
    accountGuid: routeParts[2],
    section,
    detail: routeParts[4] || DEFAULT_DETAILS[section]
  };
}

function normalizeSection(section: string | undefined): SectionId {
  return VALID_SECTION_IDS.includes(section as SectionId) ? section as SectionId : 'home';
}
