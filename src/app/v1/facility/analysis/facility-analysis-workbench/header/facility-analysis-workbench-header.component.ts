import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnalysisAutosaveState, FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisResultState, FacilityAnalysisResultsService } from '../results/calculation/facility-analysis-results.service';
import {
  FacilityAnalysisOutcomeState,
  facilityAnalysisOutcomeDisplay,
  facilityAnalysisOutcomeSummary
} from '../../facility-analysis-outcome-summary';
import { FacilityAnalysisGroupModelRosterComponent } from '../../group-model-roster/facility-analysis-group-model-roster.component';

@Component({
  selector: 'app-facility-analysis-workbench-header',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    DataWorkbenchFactsToggleComponent,
    DataWorkbenchResourceSwitcherComponent,
    FacilityAnalysisGroupModelRosterComponent
  ],
  templateUrl: './facility-analysis-workbench-header.component.html',
  styleUrls: ['./facility-analysis-workbench-header.component.css']
})
export class FacilityAnalysisWorkbenchHeaderComponent {
  private readonly router = inject(Router);
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly workflow = inject(FacilityAnalysisWorkbenchNavigationService);
  readonly analysisResources = computed(() => this.context.analyses().map(analysis => ({
    id: analysis.guid,
    label: analysis.name || 'Untitled analysis',
    icon: 'analysis' as const
  })));
  readonly resultOutcome = computed(() => facilityAnalysisResultOutcome(
    this.results.state(),
    this.autosave.state(),
    this.context.hasBlockingErrors(),
    this.context.facility()
  ));
  readonly resultDisplay = computed(() => facilityAnalysisOutcomeDisplay(
    this.resultOutcome(),
    (this.autosave.draft() || this.context.analysis())?.analysisCategory ?? 'energy'
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

export function facilityAnalysisResultOutcome(
  state: FacilityAnalysisResultState,
  autosaveState: AnalysisAutosaveState = 'saved',
  hasBlockingErrors = false,
  facility: Pick<IdbFacility, 'fiscalYear'> | undefined = undefined
): FacilityAnalysisOutcomeState {
  if (state.state !== 'ready') {
    if (hasBlockingErrors || (state.state === 'waiting' && state.reason === 'blocked')) {
      return { state: 'blocked', message: 'Setup incomplete' };
    }
    if (state.state === 'loading') return { state: 'loading', message: 'Calculating…' };
    if (state.state === 'error') return { state: 'error', message: 'Calculation failed' };
    if (state.state === 'waiting' && state.reason === 'autosave') {
      if (autosaveState === 'invalid') return { state: 'blocked', message: 'Setup incomplete' };
      if (autosaveState === 'error') return { state: 'error', message: 'Save failed' };
      return { state: 'loading', message: 'Waiting for save…' };
    }
    if (state.state === 'waiting') return { state: 'loading', message: 'Preparing data…' };
    return { state: 'error', message: 'Unavailable' };
  }
  return {
    state: 'ready',
    summary: facilityAnalysisOutcomeSummary(state.annual, state.monthly, state.reportYear, facility)
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
