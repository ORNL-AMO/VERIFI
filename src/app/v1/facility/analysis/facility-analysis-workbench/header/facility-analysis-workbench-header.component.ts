import { facilityContextBreadcrumbs } from '@app/v1/shared/page-identity/facility-context-breadcrumbs';
import { analysisDependencyMessage as facilityAnalysisDependencyMessage } from '@app/v1/shared/analysis-results/analysis-dependency-message';
import { Component, computed, inject } from '@angular/core';
import { ReportAnalysisReturnService } from '@app/v1/shared/reports/report-analysis-return.service';
import { Router } from '@angular/router';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { PageBreadcrumb, PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnalysisAutosaveState, FacilityAnalysisAutosaveService } from '../editing/facility-analysis-autosave.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { AnalysisStatusNotesComponent } from '@app/v1/shared/analysis-results/status-notes/analysis-status-notes.component';
import { FacilityAnalysisResultState, FacilityAnalysisResultsService } from '../results/calculation/facility-analysis-results.service';
import {
  FacilityAnalysisOutcomeState,
  facilityAnalysisOutcomeDisplay,
  facilityAnalysisOutcomeSummary
} from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { FacilityAnalysisGroupModelRosterComponent } from '../../group-model-roster/facility-analysis-group-model-roster.component';
import { AccountAnalysisReturnService } from '../navigation/account-analysis-return.service';
import { StatusItem } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';

@Component({
  selector: 'app-facility-analysis-workbench-header',
  standalone: true,
  imports: [
    PageIdentityComponent,
    IconComponent,
    DataWorkbenchFactsToggleComponent,
    DataWorkbenchResourceSwitcherComponent,
    FacilityAnalysisGroupModelRosterComponent,
    AnalysisStatusNotesComponent
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
  readonly accountAnalysisReturn = inject(AccountAnalysisReturnService);
  readonly reportReturn = inject(ReportAnalysisReturnService, { optional: true });
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.context.account(), facility = this.context.facility();
    return facility ? facilityContextBreadcrumbs(this.navigation.isSingleSiteWorkspace(),
      { label: account?.name || 'Account', route: account ? this.navigation.accountAnalysisRoute(account.guid) : undefined },
      { label: facility.name || 'Facility', route: this.navigation.facilityAnalysisRoute(facility.guid) }
    ) : [];
  });
  readonly statusNotes = computed(() => facilityAnalysisHeaderFindings(this.context.findings()));
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

  async returnToReport(): Promise<void> {
    if (await this.autosave.flush()) await this.reportReturn?.returnToReport();
  }
}

export function facilityAnalysisHeaderFindings(findings: readonly StatusItem[]): readonly StatusItem[] {
  const regressionFindings = findings.filter(isRegressionSetupNote);
  if (regressionFindings.length < 2) return findings;

  const first = regressionFindings[0];
  const reasons = [...new Set<string>(regressionFindings.flatMap(finding => {
    const values = finding.evidence['reasons'];
    return Array.isArray(values) ? values : [];
  }))];
  const combined = presentFinding({ ...first, evidence: { ...first.evidence, reasons } });
  const summary = {
    ...combined,
    description: `${regressionFindings.length} groups need regression setup. ${combined.description}`
  };
  return findings.flatMap(finding => {
    if (!isRegressionSetupNote(finding)) return [finding];
    return finding.id === first.id ? [summary] : [];
  });
}

function isRegressionSetupNote(finding: StatusItem): boolean {
  return finding.code === 'analysis-group.setup.invalid'
    && finding.destination.kind === 'facility-analysis'
    && finding.destination.scope === 'group'
    && finding.destination.tab === 'regression';
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
