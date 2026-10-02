import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { activeAnalysisWorkbenchStageId, buildAnalysisWorkbenchStageAttention, buildAnalysisWorkbenchStageNavigation, findingsForAnalysisStage, stageHasBlockingErrors } from './facility-analysis-workbench.models';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';
import { AnalysisAutosaveState, FacilityAnalysisAutosaveService } from './facility-analysis-autosave.service';
import { FacilityAnalysisResultState, FacilityAnalysisResultsService } from './facility-analysis-results.service';
import { FacilityAnalysisResultsDisplayService } from './facility-analysis-results-display.service';
import { RegressionCandidateStore } from './regression/regression-candidate.store';

@Component({
  selector: 'app-facility-analysis-workbench',
  standalone: true,
  providers: [
    FacilityAnalysisWorkbenchContext,
    FacilityAnalysisAutosaveService,
    FacilityAnalysisResultsService,
    FacilityAnalysisResultsDisplayService,
    RegressionCandidateStore
  ],
  imports: [RouterOutlet, RouterLink, DecimalPipe, IconComponent, DataWorkbenchFactsToggleComponent, DataWorkbenchResourceSwitcherComponent],
  templateUrl: './facility-analysis-workbench.component.html',
  styleUrls: ['./facility-analysis-workbench.component.css']
})
export class FacilityAnalysisWorkbenchComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeStageState = signal(activeAnalysisWorkbenchStageId(this.router.url));
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly activeStageId = this.activeStageState.asReadonly();
  readonly analysisResources = computed(() => this.context.analyses().map(analysis => ({
    id: analysis.guid,
    label: analysis.name || 'Untitled analysis',
    icon: 'analysis' as const
  })));
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
  readonly stageNavigation = computed(() => {
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
  readonly resultFacts = computed(() => facilityAnalysisResultFacts(this.results.state()));
  readonly dependencyMessage = computed(() => {
    const analysis = this.context.analysis();
    if (!analysis) return undefined;
    const accountAnalysisCount = this.context.workspace.accountAnalyses().filter(item =>
      item.facilityAnalysisItems?.some(link => link.analysisItemId === analysis.guid && link.facilityId === analysis.facilityId)
    ).length;
    const reportCount = this.context.workspace.selectedFacilityReports().filter(report => report.analysisItemId === analysis.guid).length;
    const bankingConsumerCount = this.context.analyses().filter(item => item.bankedAnalysisItemId === analysis.guid).length;
    return facilityAnalysisDependencyMessage(accountAnalysisCount, reportCount, bankingConsumerCount);
  });
  readonly navigationRequirement = computed(() => analysisNavigationRequirement(
    this.autosave.state(), this.currentStageHasBlockingErrors(), !!this.nextStage()
  ));
  readonly navigationDisabled = computed(() => !!this.navigationRequirement());

  constructor() {
    this.syncActiveStage(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.syncActiveStage(event.urlAfterRedirects));
  }

  switchAnalysis(analysisGuid: string): void {
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, analysisGuid));
  }

  back(): void {
    const previous = this.previousStage();
    if (previous) {
      void this.router.navigate(previous.route);
      return;
    }
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisRoute(facility.guid));
  }

  continue(): void {
    const next = this.nextStage();
    if (next) void this.router.navigate(next.route);
  }

  finish(): void {
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisRoute(facility.guid));
  }

  hasUnsavedChanges(): boolean { return this.autosave.isDirty(); }
  isNavigationBlocked(): boolean { return this.autosave.isBlocked(); }

  private syncActiveStage(url: string): void {
    const stageId = activeAnalysisWorkbenchStageId(url);
    this.activeStageState.set(stageId);
  }
}

export interface FacilityAnalysisResultFacts {
  readonly latestCompleteYear?: number;
  readonly totalSavingsPercentImprovement?: number;
  readonly pending: boolean;
}

export function facilityAnalysisResultFacts(state: FacilityAnalysisResultState): FacilityAnalysisResultFacts {
  if (state.state !== 'ready') {
    return { pending: state.state === 'loading' || state.state === 'waiting' };
  }
  const latestCompleteYear = state.reportYear ?? state.annual.reduce<number | undefined>(
    (latest, summary) => latest === undefined || summary.year > latest ? summary.year : latest,
    undefined
  );
  const latestSummary = state.annual.find(summary => summary.year === latestCompleteYear);
  const totalSavingsPercentImprovement = latestSummary?.totalSavingsPercentImprovement;
  return {
    latestCompleteYear,
    totalSavingsPercentImprovement: Number.isFinite(totalSavingsPercentImprovement)
      ? totalSavingsPercentImprovement
      : undefined,
    pending: false
  };
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

export function facilityAnalysisDependencyMessage(
  accountAnalysisCount: number,
  reportCount: number,
  bankingConsumerCount: number
): string | undefined {
  const dependencies = [
    dependencyCountLabel(accountAnalysisCount, 'account analysis', 'account analyses'),
    dependencyCountLabel(reportCount, 'report', 'reports'),
    dependencyCountLabel(bankingConsumerCount, 'banking consumer', 'banking consumers')
  ].filter((label): label is string => !!label);

  if (!dependencies.length) return undefined;
  if (dependencies.length === 1) return `Changes can affect ${dependencies[0]}.`;
  if (dependencies.length === 2) return `Changes can affect ${dependencies[0]} and ${dependencies[1]}.`;
  return `Changes can affect ${dependencies[0]}, ${dependencies[1]}, and ${dependencies[2]}.`;
}

function dependencyCountLabel(count: number, singular: string, plural: string): string | undefined {
  if (!count) return undefined;
  return `${count} ${count === 1 ? singular : plural}`;
}
