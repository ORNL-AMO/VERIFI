import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusEvaluationState } from '@app/v1/status/status.models';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import {
  ACCOUNT_ANALYSIS_RESULT_TABS,
  AccountAnalysisResultTabId,
  AccountAnalysisWorkbenchStageId,
  activeAccountAnalysisResultTabId,
  activeAccountAnalysisWorkbenchStageId,
  buildAccountAnalysisWorkbenchStageNavigation,
  accountAnalysisWorkbenchReadiness,
  findingsForAccountAnalysisStage
} from '../account-analysis-workbench.models';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';

@Injectable()
export class AccountAnalysisWorkbenchNavigationService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly context = inject(AccountAnalysisWorkbenchContext);
  private readonly autosave = inject(AccountAnalysisAutosaveService);
  private readonly workspaceNavigation = inject(WorkspaceNavigationService);
  private readonly activeStageState = signal<AccountAnalysisWorkbenchStageId>(
    activeAccountAnalysisWorkbenchStageId(this.router.url)
  );
  private readonly activeResultTabState = signal<AccountAnalysisResultTabId>(
    activeAccountAnalysisResultTabId(this.router.url)
  );

  readonly activeStageId = this.activeStageState.asReadonly();
  readonly activeResultTabId = this.activeResultTabState.asReadonly();
  readonly readiness = computed(() => accountAnalysisWorkbenchReadiness(
    this.autosave.draft() || this.context.analysis(),
    this.context.findings(),
    this.context.status.state() === 'ready',
    this.context.selections().length === this.context.facilities().length
      && this.context.selections().every(item => item.state === 'included' || item.state === 'skipped')
  ));
  readonly stages = computed(() => buildAccountAnalysisWorkbenchStageNavigation(
    this.context.stages(),
    this.activeStageId(),
    this.readiness(),
    this.context.findings()
  ));
  readonly stageIndex = computed(() => this.stages().findIndex(stage => stage.id === this.activeStageId()));
  readonly currentStage = computed(() => this.stages()[this.stageIndex()]);
  readonly currentStageFindings = computed(() => findingsForAccountAnalysisStage(
    this.activeStageId(),
    this.context.findings()
  ));
  readonly resultTabs = computed(() => this.activeStageId() === 'results' ? ACCOUNT_ANALYSIS_RESULT_TABS : []);
  readonly previousStage = computed(() => this.stages()
    .slice(0, this.stageIndex())
    .reverse()
    .find(stage => stage.available));
  readonly nextStage = computed(() => this.stages()[this.stageIndex() + 1]);
  readonly requirement = computed(() => accountAnalysisNavigationRequirement(
    this.activeStageId(),
    this.context.status.state(),
    this.readiness().setupComplete,
    this.readiness().selectionsComplete,
    this.autosave.state()
  ));
  readonly disabled = computed(() => !!this.requirement());

  private readonly redirectLockedStageEffect = effect(() => {
    const current = this.currentStage();
    const statusState = this.context.status.state();
    if (!current || current.available || statusState === 'idle' || statusState === 'evaluating') return;
    const fallback = this.readiness().setupComplete
      ? this.stages().find(stage => stage.id === 'select-items')
      : this.stages().find(stage => stage.id === 'setup');
    if (fallback) void this.router.navigate(fallback.route, { replaceUrl: true });
  });

  constructor() {
    this.syncFromUrl(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.syncFromUrl(event.urlAfterRedirects));
  }

  async back(): Promise<void> {
    if (!await this.autosave.flush()) return;
    const previous = this.previousStage();
    if (previous) {
      void this.router.navigate(previous.route);
      return;
    }
    const account = this.context.account();
    if (account) void this.router.navigate(this.workspaceNavigation.accountAnalysisRoute(account.guid));
  }

  async continue(): Promise<void> {
    if (this.disabled()) return;
    if (!await this.autosave.flush()) return;
    const next = this.nextStage();
    if (next?.available) void this.router.navigate(next.route);
  }

  async finish(): Promise<void> {
    if (!await this.autosave.flush()) return;
    const account = this.context.account();
    if (account) void this.router.navigate(this.workspaceNavigation.accountAnalysisRoute(account.guid));
  }

  openResultTab(tabId: string): void {
    if (this.activeStageId() !== 'results') return;
    const tab = ACCOUNT_ANALYSIS_RESULT_TABS.find(item => item.id === tabId);
    const account = this.context.account();
    const analysis = this.context.analysis();
    if (!tab || !account || !analysis) return;
    void this.router.navigate(this.workspaceNavigation.accountAnalysisResultsRoute(
      account.guid,
      analysis.guid,
      tab.id
    ));
  }

  private syncFromUrl(url: string): void {
    this.activeStageState.set(activeAccountAnalysisWorkbenchStageId(url));
    this.activeResultTabState.set(activeAccountAnalysisResultTabId(url));
  }
}

export function accountAnalysisNavigationRequirement(
  stageId: AccountAnalysisWorkbenchStageId,
  statusState: StatusEvaluationState,
  setupComplete: boolean,
  selectionsComplete: boolean,
  autosaveState: import('../editing/account-analysis-autosave.service').AccountAnalysisAutosaveState = 'saved'
): string | undefined {
  if (autosaveState === 'saving') return 'Saving changes before navigation is available.';
  if (autosaveState === 'invalid') return 'Fix the validation errors before continuing.';
  if (autosaveState === 'error') return 'Retry or discard the unsaved changes before continuing.';
  if ((stageId === 'setup' || stageId === 'select-items') && (statusState === 'idle' || statusState === 'evaluating')) {
    return 'Checking analysis status before navigation is available.';
  }
  if ((stageId === 'setup' || stageId === 'select-items') && statusState === 'error') {
    return 'Analysis status is unavailable. Retry the workspace status check before continuing.';
  }
  if (stageId === 'setup' && !setupComplete) {
    return 'Complete the analysis name and baseline year before continuing.';
  }
  if (stageId === 'select-items' && !selectionsComplete) {
    return 'Select a valid facility analysis or skip every facility before viewing Results.';
  }
  return undefined;
}
