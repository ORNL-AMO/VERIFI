import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AnalysisAutosaveState, FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import {
  ANALYSIS_FACILITY_TABS,
  AnalysisWorkbenchTab,
  AnalysisWorkbenchTabId,
  activeAnalysisWorkbenchStageId,
  buildAnalysisWorkbenchStageAttention,
  buildAnalysisWorkbenchStageNavigation,
  buildAnalysisWorkbenchTabAttention,
  findingsForAnalysisStage,
  stageHasBlockingErrors,
  tabsForAnalysisGroup
} from '../facility-analysis-workbench.models';
import { bankingTabAvailable } from '../banking/facility-analysis-banking';
import { FacilityAnalysisPeriodService } from '../analysis-setup/facility-analysis-period.service';

@Injectable()
export class FacilityAnalysisWorkbenchNavigationService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly autosave = inject(FacilityAnalysisAutosaveService);
  private readonly workspaceNavigation = inject(WorkspaceNavigationService);
  private readonly period = inject(FacilityAnalysisPeriodService);
  private readonly activeStageState = signal(activeAnalysisWorkbenchStageId(this.router.url));
  private readonly activeContextTabState = signal<AnalysisWorkbenchTabId>(activeAnalysisWorkbenchTabId(this.router.url));

  readonly activeStageId = this.activeStageState.asReadonly();
  readonly activeContextTabId = this.activeContextTabState.asReadonly();
  readonly stageIndex = computed(() => this.context.stages().findIndex(stage => stage.id === this.activeStageId()));
  readonly currentStage = computed(() => this.context.stages()[this.stageIndex()]);
  readonly currentStageHasBlockingErrors = computed(() => stageHasBlockingErrors(
    this.currentStage(), this.context.analysisGuid(), this.context.findings()
  ));
  readonly currentStageFindings = computed(() => findingsForAnalysisStage(
    this.currentStage(), this.context.analysisGuid(), this.context.findings()
  ));
  readonly navigationBlocked = computed(() => ['saving', 'invalid', 'error'].includes(this.autosave.state()));
  readonly stages = computed(() => {
    const stages = this.context.stages();
    const attention = buildAnalysisWorkbenchStageAttention(
      stages,
      this.context.analysisGuid(),
      this.context.findings()
    );
    return buildAnalysisWorkbenchStageNavigation(
      stages,
      this.activeStageId(),
      this.context.analysisGuid(),
      this.context.findings(),
      this.navigationBlocked(),
      this.context.status.state() === 'ready'
    ).map(stage => ({ ...stage, attention: attention[stage.id] }));
  });
  readonly currentNavigationStage = computed(() => this.stages().find(stage => stage.id === this.activeStageId()));
  readonly previousStage = computed(() => this.stages()
    .slice(0, this.stageIndex())
    .reverse()
    .find(stage => stage.available));
  readonly nextStage = computed(() => this.stages()[this.stageIndex() + 1]);
  readonly contextTabs = computed<readonly AnalysisWorkbenchTab[]>(() => {
    const stage = this.currentStage();
    if (stage?.kind === 'facility') return ANALYSIS_FACILITY_TABS;
    if (stage?.kind !== 'group' || !stage.groupGuid) return [];
    const analysis = this.autosave.draft() || this.context.analysis();
    const group = analysis?.groups.find(item => item.idbGroupId === stage.groupGuid);
    return tabsForAnalysisGroup(group, analysis?.hasBanking === true, bankingTabAvailable(
      analysis,
      group,
      this.context.analyses(),
      this.context.status.items(),
      this.period.bankingLatestCompleteYears(stage.groupGuid)
    ));
  });
  readonly contextTabAttention = computed(() => {
    const stage = this.currentStage();
    const tabs = this.contextTabs();
    if (!stage || !tabs.length || (stage.kind !== 'group' && stage.kind !== 'facility')) return {};
    return buildAnalysisWorkbenchTabAttention(
      tabs,
      this.context.analysisGuid(),
      stage.kind,
      this.context.findings(),
      stage.groupGuid
    );
  });
  readonly requirement = computed(() => analysisNavigationRequirement(
    this.autosave.state(),
    this.currentStage()?.kind,
    this.currentStageHasBlockingErrors(),
    this.nextStage()?.kind,
    this.nextStage()?.available
  ));
  readonly disabled = computed(() => !!this.requirement());
  private readonly redirectLockedStageEffect = effect(() => {
    if (this.context.status.state() !== 'ready') return;
    const current = this.currentNavigationStage();
    if (!current || current.available) return;
    const setup = this.stages().find(stage => stage.kind === 'analysis');
    const fallback = current.kind === 'facility' && setup?.completed
      ? this.stages().find(stage => stage.kind === 'group' && !stage.completed) ?? setup
      : setup;
    if (fallback) void this.router.navigate(fallback.route, { replaceUrl: true });
  });

  constructor() {
    this.syncActiveStage(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.syncActiveStage(event.urlAfterRedirects));
  }

  back(): void {
    if (this.navigationBlocked()) return;
    const previous = this.previousStage();
    if (previous) {
      void this.router.navigate(previous.route);
      return;
    }
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.workspaceNavigation.facilityAnalysisRoute(facility.guid));
  }

  continue(): void {
    if (this.disabled()) return;
    const next = this.nextStage();
    if (next) void this.router.navigate(next.route);
  }

  finish(): void {
    if (this.disabled()) return;
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.workspaceNavigation.facilityAnalysisRoute(facility.guid));
  }

  openContextTab(tabId: string): void {
    const stage = this.currentStage();
    const tab = this.contextTabs().find(item => item.id === tabId);
    if (!stage || !tab || tab.disabled) return;
    void this.router.navigate([...stage.route.slice(0, -1), tabId]);
  }

  private syncActiveStage(url: string): void {
    this.activeStageState.set(activeAnalysisWorkbenchStageId(url));
    this.activeContextTabState.set(activeAnalysisWorkbenchTabId(url));
  }
}

function activeAnalysisWorkbenchTabId(url: string): AnalysisWorkbenchTabId {
  const segments = url.split(/[?#]/, 1)[0].split('/');
  const tabId = segments[segments.length - 1];
  return tabId === 'regression'
    || tabId === 'banking'
    || tabId === 'annual'
    || tabId === 'monthly-table'
    || tabId === 'monthly-chart'
    || tabId === 'group-contributions'
    ? tabId
    : 'setup';
}

export function analysisNavigationRequirement(
  autosaveState: AnalysisAutosaveState,
  currentStageKind: 'analysis' | 'group' | 'facility' | 'used-by' | undefined,
  currentStageHasBlockingErrors: boolean,
  nextStageKind: 'analysis' | 'group' | 'facility' | 'used-by' | undefined,
  nextStageAvailable: boolean | undefined
): string | undefined {
  if (autosaveState === 'saving') return 'Saving changes before navigation is available.';
  if (autosaveState === 'invalid') return 'Fix the validation errors before continuing.';
  if (autosaveState === 'error') return 'Retry or discard the unsaved changes before continuing.';
  if (currentStageKind === 'analysis' && currentStageHasBlockingErrors) {
    return 'Resolve the errors in Analysis Setup before continuing.';
  }
  if (currentStageKind === 'analysis' && nextStageKind === 'group' && nextStageAvailable === false) {
    return 'Checking analysis status before navigation is available.';
  }
  if (currentStageKind === 'analysis' && nextStageKind === 'facility' && nextStageAvailable === false) {
    return 'Add and complete an analysis group before viewing Facility Results.';
  }
  if (currentStageKind === 'group' && nextStageKind === 'facility' && nextStageAvailable === false) {
    return 'Complete all analysis groups before viewing Facility Results.';
  }
  return undefined;
}
