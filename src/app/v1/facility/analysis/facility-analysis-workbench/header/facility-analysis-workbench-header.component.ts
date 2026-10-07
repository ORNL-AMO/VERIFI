import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisPeriodService } from '../analysis-setup/facility-analysis-period.service';
import { AnalysisAutosaveState, FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisResultState, FacilityAnalysisResultsService } from '../results/calculation/facility-analysis-results.service';

@Component({
  selector: 'app-facility-analysis-workbench-header',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    IconComponent,
    DataWorkbenchFactsToggleComponent,
    DataWorkbenchResourceSwitcherComponent
  ],
  templateUrl: './facility-analysis-workbench-header.component.html',
  styleUrls: ['./facility-analysis-workbench-header.component.css']
})
export class FacilityAnalysisWorkbenchHeaderComponent {
  private readonly router = inject(Router);
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly period = inject(FacilityAnalysisPeriodService);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly workflow = inject(FacilityAnalysisWorkbenchNavigationService);
  readonly analysisResources = computed(() => this.context.analyses().map(analysis => ({
    id: analysis.guid,
    label: analysis.name || 'Untitled analysis',
    icon: 'analysis' as const
  })));
  readonly resultFacts = computed(() => facilityAnalysisResultFacts(
    this.results.state(),
    this.autosave.state(),
    this.context.hasBlockingErrors()
  ));
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

  switchAnalysis(analysisGuid: string): void {
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, analysisGuid));
  }
}

export interface FacilityAnalysisResultFacts {
  readonly totalSavingsPercentImprovement?: number;
  readonly unavailableMessage?: string;
}

export function facilityAnalysisResultFacts(
  state: FacilityAnalysisResultState,
  autosaveState: AnalysisAutosaveState = 'saved',
  hasBlockingErrors = false
): FacilityAnalysisResultFacts {
  if (state.state !== 'ready') {
    if (hasBlockingErrors || (state.state === 'waiting' && state.reason === 'blocked')) {
      return { unavailableMessage: 'Setup incomplete' };
    }
    if (state.state === 'loading') return { unavailableMessage: 'Calculating…' };
    if (state.state === 'error') return { unavailableMessage: 'Calculation failed' };
    if (state.state === 'waiting' && state.reason === 'autosave') {
      if (autosaveState === 'invalid') return { unavailableMessage: 'Setup incomplete' };
      if (autosaveState === 'error') return { unavailableMessage: 'Save failed' };
      return { unavailableMessage: 'Waiting for save…' };
    }
    if (state.state === 'waiting') return { unavailableMessage: 'Preparing data…' };
    return { unavailableMessage: 'Unavailable' };
  }
  const reportYear = state.reportYear ?? state.annual.reduce<number | undefined>(
    (latest, summary) => latest === undefined || summary.year > latest ? summary.year : latest,
    undefined
  );
  const latestSummary = state.annual.find(summary => summary.year === reportYear);
  const totalSavingsPercentImprovement = latestSummary?.totalSavingsPercentImprovement;
  return {
    totalSavingsPercentImprovement: Number.isFinite(totalSavingsPercentImprovement)
      ? totalSavingsPercentImprovement
      : undefined,
    unavailableMessage: Number.isFinite(totalSavingsPercentImprovement) ? undefined : 'Unavailable'
  };
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
