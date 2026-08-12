import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { buildP1PrototypeData } from './p1-real-data.adapter';
import {
  P1AccountSummary,
  P1ContextMode,
  P1FacilitySummary,
  P1NavItem,
  P1PanelContent,
  P1PanelTabId,
  P1PrototypeData,
  P1SectionDefinition,
  P1SectionId,
  P1ViewState,
  P1WelcomeAction,
  P1WorkspaceContent
} from './p1.models';

const DEFAULT_SECTION: P1SectionId = 'home';
const DEFAULT_PANEL_TAB: P1PanelTabId = 'help';
const DEFAULT_DETAILS: Record<P1ContextMode, Record<P1SectionId, string>> = {
  account: {
    home: 'overview',
    data: 'meters',
    visualization: 'time-series',
    analysis: 'rollup',
    reports: 'setup',
    settings: 'profile',
    imports: 'template'
  },
  facility: {
    home: 'overview',
    data: 'meters',
    visualization: 'time-series',
    analysis: 'setup',
    reports: 'overview-report',
    settings: 'profile',
    imports: 'meter-import'
  }
};
const VALID_SECTIONS: ReadonlyArray<P1SectionId> = [
  'home',
  'data',
  'visualization',
  'analysis',
  'reports',
  'settings',
  'imports'
];
const VALID_PANEL_TABS: ReadonlyArray<P1PanelTabId> = ['help', 'todos', 'results', 'details'];

interface P1RawRouteState {
  view: 'welcome' | 'workspace';
  contextMode: P1ContextMode;
  facilityGuid?: string;
  section?: string;
  detail?: string;
  panelTab?: string;
}

export interface P1WorkspaceRouteState {
  view: 'welcome' | 'workspace';
  contextMode: P1ContextMode;
  facilityGuid?: string;
  section: P1SectionId;
  detail: string;
  panelTab: P1PanelTabId;
  canonicalUrl: string;
}

@Injectable()
export class P1RouteFacade {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly workspaceStore = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly currentUrl = signal(this.router.url);
  private lastSyncedAccountGuid: string | undefined;
  private lastSyncedFacilityGuid: string | undefined;

  readonly darkMode = signal(false);
  readonly isRightPanelOpen = signal(true);

  readonly data = computed<P1PrototypeData>(() => buildP1PrototypeData({
    accounts: this.lifecycle.usableAccounts(),
    startupState: this.lifecycle.state(),
    workspaceStatus: this.workspaceStore.status(),
    workspaceError: this.workspaceStore.error(),
    snapshot: this.workspaceStore.snapshot(),
    selectedFacilityGuid: this.workspaceStore.selectedFacility()?.guid
  }));

  readonly routeState = computed<P1WorkspaceRouteState>(() => this.normalizeRouteState(
    this.parseUrl(this.currentUrl()),
    this.data()
  ));

  readonly isWorkspaceRoute = computed(() => this.routeState().view === 'workspace');
  readonly contextMode = computed(() => this.routeState().contextMode);
  readonly activeSection = computed(() => this.routeState().section);
  readonly activeDetailId = computed(() => this.routeState().detail);
  readonly activePanelTab = computed(() => this.routeState().panelTab);
  readonly state = computed<P1ViewState>(() => this.data().state);
  readonly accounts = computed<Array<P1AccountSummary>>(() => this.data().accounts);
  readonly facilities = computed<Array<P1FacilitySummary>>(() => this.data().facilities);
  readonly sections = computed<Array<P1SectionDefinition>>(() => this.data().sections);
  readonly welcomeActions = computed<Array<P1WelcomeAction>>(() => this.data().welcomeActions);

  readonly selectedAccount = computed<P1AccountSummary | undefined>(() => {
    const data = this.data();
    return data.accounts.find(account => account.id === data.selectedAccountId)
      || data.accounts.find(account => account.isActive)
      || data.accounts[0];
  });

  readonly accountFacilities = computed<Array<P1FacilitySummary>>(() => {
    const account = this.selectedAccount();
    if (!account) {
      return [];
    }
    return this.data().facilities.filter(facility => facility.accountId === account.id);
  });

  readonly selectedFacility = computed<P1FacilitySummary | undefined>(() => {
    const routeState = this.routeState();
    const facilities = this.accountFacilities();
    if (routeState.contextMode === 'facility' && routeState.facilityGuid) {
      return facilities.find(facility => facility.id === routeState.facilityGuid) || facilities[0];
    }
    return facilities.find(facility => facility.id === this.data().selectedFacilityId) || facilities[0];
  });

  readonly navGroups = computed(() => this.data().nav[this.contextMode()][this.activeSection()]);
  readonly activeNavItem = computed<P1NavItem>(() => {
    const items = this.navGroups().flatMap(group => group.items);
    const detailId = this.activeDetailId();
    return items.find(item => item.id === detailId) || {
      id: detailId,
      label: this.getDetailLabel(detailId)
    };
  });
  readonly content = computed<P1WorkspaceContent>(() => this.data().content[this.contextMode()][this.activeSection()]);
  readonly panelContent = computed<P1PanelContent>(() => this.data().panel[this.contextMode()][this.activeSection()]);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => this.currentUrl.set(event.urlAfterRedirects));

    effect(() => {
      const state = this.routeState();
      const dataState = this.data().state.status;
      if (state.view !== 'workspace' || dataState === 'loading') {
        return;
      }
      const currentPath = this.getPath(this.currentUrl());
      if (currentPath !== state.canonicalUrl) {
        untracked(() => {
          void this.router.navigateByUrl(state.canonicalUrl, { replaceUrl: true });
        });
      }
    });

    effect(() => {
      const state = this.routeState();
      if (state.view !== 'workspace' || this.data().state.status !== 'ready') {
        return;
      }
      untracked(() => {
        void this.syncWorkspaceSelection(state);
      });
    });
  }

  showWelcome(): void {
    void this.router.navigate(['/p1']);
  }

  async openWorkspace(accountGuid?: string): Promise<void> {
    const targetAccountGuid = accountGuid || this.data().selectedAccountId || this.data().accounts[0]?.id;
    if (!targetAccountGuid) {
      return;
    }
    await this.selectAccount(targetAccountGuid);
    void this.navigateToWorkspace('account', DEFAULT_SECTION, undefined, DEFAULT_PANEL_TAB);
  }

  async switchAccount(accountGuid: string): Promise<void> {
    await this.selectAccount(accountGuid);
    void this.navigateToWorkspace('account', DEFAULT_SECTION, undefined, this.activePanelTab());
  }

  setContext(contextMode: P1ContextMode): void {
    if (contextMode === 'facility') {
      const facilityGuid = this.selectedFacility()?.id || this.accountFacilities()[0]?.id;
      if (facilityGuid) {
        void this.navigateToWorkspace('facility', DEFAULT_SECTION, facilityGuid, this.activePanelTab());
        return;
      }
    }
    void this.navigateToWorkspace('account', DEFAULT_SECTION, undefined, this.activePanelTab());
  }

  setFacility(facilityGuid: string): void {
    const section = this.activeSection();
    void this.selectFacility(facilityGuid);
    void this.navigateToWorkspace('facility', section, facilityGuid, this.activePanelTab());
  }

  setSection(sectionId: P1SectionId): void {
    const context = this.contextMode();
    const facilityGuid = context === 'facility' ? this.selectedFacility()?.id : undefined;
    void this.navigateToWorkspace(context, sectionId, facilityGuid, this.activePanelTab());
  }

  setDetail(detailId: string): void {
    const context = this.contextMode();
    const facilityGuid = context === 'facility' ? this.selectedFacility()?.id : undefined;
    void this.navigateToWorkspace(context, this.activeSection(), facilityGuid, this.activePanelTab(), detailId);
  }

  setPanelTab(tabId: P1PanelTabId): void {
    this.isRightPanelOpen.set(true);
    const context = this.contextMode();
    const facilityGuid = context === 'facility' ? this.selectedFacility()?.id : undefined;
    void this.navigateToWorkspace(context, this.activeSection(), facilityGuid, tabId, this.activeDetailId());
  }

  toggleRightPanel(): void {
    this.isRightPanelOpen.update(open => !open);
  }

  hideRightPanel(): void {
    this.isRightPanelOpen.set(false);
  }

  toggleDarkMode(): void {
    this.darkMode.update(enabled => !enabled);
  }

  private async navigateToWorkspace(
    contextMode: P1ContextMode,
    sectionId: P1SectionId,
    facilityGuid: string | undefined,
    panelTab: P1PanelTabId,
    detailId?: string
  ): Promise<boolean> {
    const section = isP1Section(sectionId) ? sectionId : DEFAULT_SECTION;
    const detail = this.getValidDetail(contextMode, section, detailId);
    const tab = isP1PanelTab(panelTab) ? panelTab : DEFAULT_PANEL_TAB;
    if (contextMode === 'facility' && facilityGuid) {
      return this.router.navigate(['/p1', 'workspace', 'facility', facilityGuid, section, detail, tab]);
    }
    return this.router.navigate(['/p1', 'workspace', 'account', section, detail, tab]);
  }

  private async syncWorkspaceSelection(state: P1WorkspaceRouteState): Promise<void> {
    const selectedAccountGuid = this.selectedAccount()?.id;
    if (selectedAccountGuid && this.workspaceStore.account()?.guid !== selectedAccountGuid && this.lastSyncedAccountGuid !== selectedAccountGuid) {
      this.lastSyncedAccountGuid = selectedAccountGuid;
      await this.selectAccount(selectedAccountGuid);
    }
    if (state.contextMode === 'facility' && state.facilityGuid && this.workspaceStore.selectedFacility()?.guid !== state.facilityGuid && this.lastSyncedFacilityGuid !== state.facilityGuid) {
      this.lastSyncedFacilityGuid = state.facilityGuid;
      this.selectFacility(state.facilityGuid);
    }
  }

  private async selectAccount(accountGuid: string): Promise<void> {
    if (this.workspaceStore.account()?.guid === accountGuid) {
      return;
    }
    try {
      await this.workspaceService.selectAccount(accountGuid);
    } catch (error) {
      console.warn('P1 prototype could not load account workspace.', error);
    }
  }

  private selectFacility(facilityGuid: string): void {
    try {
      this.workspaceService.selectFacility(facilityGuid);
    } catch (error) {
      console.warn('P1 prototype could not select facility.', error);
    }
  }

  private normalizeRouteState(raw: P1RawRouteState, data: P1PrototypeData): P1WorkspaceRouteState {
    if (raw.view === 'welcome') {
      return {
        view: 'welcome',
        contextMode: 'account',
        section: DEFAULT_SECTION,
        detail: this.getFirstDetail('account', DEFAULT_SECTION),
        panelTab: DEFAULT_PANEL_TAB,
        canonicalUrl: '/p1'
      };
    }

    const loaded = data.state.status !== 'loading';
    const requestedFacility = raw.contextMode === 'facility' && raw.facilityGuid
      ? data.facilities.find(facility => facility.id === raw.facilityGuid)
      : undefined;
    const contextMode: P1ContextMode = raw.contextMode === 'facility' && (!loaded || requestedFacility)
      ? 'facility'
      : 'account';
    const facilityGuid = contextMode === 'facility' ? raw.facilityGuid : undefined;
    const section = isP1Section(raw.section) ? raw.section : DEFAULT_SECTION;
    const detail = this.getValidDetail(contextMode, section, raw.detail);
    const panelTab = isP1PanelTab(raw.panelTab) ? raw.panelTab : DEFAULT_PANEL_TAB;
    return {
      view: 'workspace',
      contextMode,
      facilityGuid,
      section,
      detail,
      panelTab,
      canonicalUrl: this.buildCanonicalUrl(contextMode, section, detail, panelTab, facilityGuid)
    };
  }

  private parseUrl(url: string): P1RawRouteState {
    const parts = this.getPath(url).split('/').filter(Boolean);
    const p1Index = parts.indexOf('p1');
    const routeParts = p1Index >= 0 ? parts.slice(p1Index + 1) : parts;
    if (routeParts[0] !== 'workspace') {
      return {
        view: 'welcome',
        contextMode: 'account'
      };
    }
    if (routeParts[1] === 'facility') {
      return {
        view: 'workspace',
        contextMode: 'facility',
        facilityGuid: routeParts[2],
        section: routeParts[3],
        detail: routeParts[4],
        panelTab: routeParts[5]
      };
    }
    return {
      view: 'workspace',
      contextMode: 'account',
      section: routeParts[2],
      detail: routeParts[3],
      panelTab: routeParts[4]
    };
  }

  private getValidDetail(contextMode: P1ContextMode, sectionId: P1SectionId, detailId?: string): string {
    return detailId || this.getFirstDetail(contextMode, sectionId);
  }

  private getFirstDetail(contextMode: P1ContextMode, sectionId: P1SectionId): string {
    return DEFAULT_DETAILS[contextMode][sectionId];
  }

  private getDetailLabel(detailId: string): string {
    return detailId
      .split('-')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private buildCanonicalUrl(
    contextMode: P1ContextMode,
    section: P1SectionId,
    detail: string,
    panelTab: P1PanelTabId,
    facilityGuid?: string
  ): string {
    if (contextMode === 'facility' && facilityGuid) {
      return `/p1/workspace/facility/${facilityGuid}/${section}/${detail}/${panelTab}`;
    }
    return `/p1/workspace/account/${section}/${detail}/${panelTab}`;
  }

  private getPath(url: string): string {
    return url.split(/[?#]/)[0] || '/p1';
  }
}

function isP1Section(value: string | undefined): value is P1SectionId {
  return !!value && VALID_SECTIONS.includes(value as P1SectionId);
}

function isP1PanelTab(value: string | undefined): value is P1PanelTabId {
  return !!value && VALID_PANEL_TABS.includes(value as P1PanelTabId);
}
