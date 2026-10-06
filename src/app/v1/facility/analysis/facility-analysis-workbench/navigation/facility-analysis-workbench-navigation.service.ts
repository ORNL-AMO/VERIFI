import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
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

@Injectable()
export class FacilityAnalysisWorkbenchNavigationService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly autosave = inject(FacilityAnalysisAutosaveService);
  private readonly workspaceNavigation = inject(WorkspaceNavigationService);
  private readonly activeStageState = signal(activeAnalysisWorkbenchStageId(this.router.url));
  private readonly activeContextTabState = signal<AnalysisWorkbenchTabId>(activeAnalysisWorkbenchTabId(this.router.url));

  readonly activeStageId = this.activeStageState.asReadonly();
  readonly activeContextTabId = this.activeContextTabState.asReadonly();
  readonly stageIndex = computed(() => this.context.stages().findIndex(stage => stage.id === this.activeStageId()));
  readonly currentStage = computed(() => this.context.stages()[this.stageIndex()]);
  readonly previousStage = computed(() => this.context.stages()[this.stageIndex() - 1]);
  readonly nextStage = computed(() => this.context.stages()[this.stageIndex() + 1]);
  readonly currentStageHasBlockingErrors = computed(() => stageHasBlockingErrors(
    this.currentStage(), this.context.analysisGuid(), this.context.findings()
  ));
  readonly currentStageFindings = computed(() => findingsForAnalysisStage(
    this.currentStage(), this.context.analysisGuid(), this.context.findings()
  ));
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
      ['saving', 'invalid', 'error'].includes(this.autosave.state())
    ).map(stage => ({ ...stage, attention: attention[stage.id] }));
  });
  readonly contextTabs = computed<readonly AnalysisWorkbenchTab[]>(() => {
    const stage = this.currentStage();
    if (stage?.kind === 'facility') return ANALYSIS_FACILITY_TABS;
    if (stage?.kind !== 'group' || !stage.groupGuid) return [];
    const analysis = this.autosave.draft() || this.context.analysis();
    return tabsForAnalysisGroup(analysis?.groups.find(group => group.idbGroupId === stage.groupGuid));
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
    this.autosave.state(), this.currentStageHasBlockingErrors(), !!this.nextStage()
  ));
  readonly disabled = computed(() => !!this.requirement());

  constructor() {
    this.syncActiveStage(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.syncActiveStage(event.urlAfterRedirects));
  }

  back(): void {
    const previous = this.previousStage();
    if (previous) {
      void this.router.navigate(previous.route);
      return;
    }
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.workspaceNavigation.facilityAnalysisRoute(facility.guid));
  }

  continue(): void {
    const next = this.nextStage();
    if (next) void this.router.navigate(next.route);
  }

  finish(): void {
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.workspaceNavigation.facilityAnalysisRoute(facility.guid));
  }

  openContextTab(tabId: string): void {
    const stage = this.currentStage();
    if (!stage || !this.contextTabs().some(tab => tab.id === tabId)) return;
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
  return tabId === 'regression' || tabId === 'annual' || tabId === 'monthly' ? tabId : 'setup';
}

export function analysisNavigationRequirement(
  autosaveState: AnalysisAutosaveState,
  currentStageHasBlockingErrors: boolean,
  hasNextStage: boolean
): string | undefined {
  if (autosaveState === 'saving') return 'Saving changes before navigation is available.';
  if (autosaveState === 'invalid') return 'Fix the validation errors before continuing.';
  if (autosaveState === 'error') return 'Retry or discard the unsaved changes before continuing.';
  if (hasNextStage && currentStageHasBlockingErrors) return 'Resolve the errors in this stage before continuing.';
  return undefined;
}
