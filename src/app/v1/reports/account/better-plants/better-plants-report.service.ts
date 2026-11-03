import { Injectable, Injector, computed, inject } from '@angular/core';
import { map } from 'rxjs';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { BetterPlantsSummary } from '@data/models/overview-report';
import { assertAnalysisReportYears, buildAnalysisReportInputs, reportYears } from '@domain/reports/analysis-report-inputs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { analysisReportContent } from '@domain/reports/analysis-review-inputs';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { AnalysisChecksController, AnalysisChecksRequest, AnalysisChecksResult } from '@app/v1/reports/shared/analysis-checks/analysis-checks-controller';
import { ReportResultState } from '@app/v1/reports/shared/calculation/report-result-state';
import { ReportResultController, ReportResultRequest } from '@app/v1/reports/shared/calculation/report-result-controller';
import { AccountReportWorkbenchContext } from '../workbench/account-report-workbench-context.service';
import { BetterPlantsEditor } from './editing/better-plants-editor.service';

export interface BetterPlantsResult extends AnalysisChecksResult {
  readonly summaries?: readonly BetterPlantsSummary[];
}
interface BetterPlantsCalculationRequest {
  readonly inputs: AnalysisChecksResult['inputs'];
  readonly years: readonly number[];
}

@Injectable()
export class BetterPlantsReportService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly editor = inject(BetterPlantsEditor);
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly injector = inject(Injector);
  private readonly input = computed<AnalysisChecksRequest>(() => this.buildInput());
  readonly checks = new AnalysisChecksController(this.input, value => this.persistReview(value));
  private readonly reportRequest = computed<ReportResultRequest<BetterPlantsResult, BetterPlantsCalculationRequest>>(() => {
    const checks = this.checks.state(), report = this.context.report(), input = this.input();
    const inputs = input.state === 'calculate' ? input.inputs : undefined;
    const years = checks.value && inputs && report && this.context.stage() === 'report'
      ? reportYears(inputs.analysis.baselineYear, report.reportYear, report.betterPlantsReportSetup.includeAllYears === true) : [];
    const content = inputs && years.length ? analysisReportContent(inputs, years) : undefined;
    const state: ReportResultState<BetterPlantsResult> = { ...checks, key: JSON.stringify([checks.key, years, content]) };
    if (state.state !== 'ready' || !state.value || !inputs || !content || this.context.stage() !== 'report') return { state };
    const value = { ...state.value, inputs };
    if (!value.completed) return { state: { ...state, state: 'review-required',
      message: value.blocked ? 'Resolve critical analysis issues before displaying this report.' : 'Review the current analysis checks and acknowledge the issues before displaying this report.' } };
    return { state: { ...state, value }, calculation: { content, request: { inputs, years } } };
  });
  private readonly results = new ReportResultController({
    request: this.reportRequest,
    loadingMessage: 'Preparing the Better Plants report…', waitingMessage: 'Checking the current analysis inputs…',
    execute: request => this.calculations.execute({ operation: 'better-plants', ...request }).pipe(map(response => {
      if (response.ok === false) throw new Error(response.message);
      if (response.operation !== 'better-plants') throw new Error('Report processing returned an unexpected result.');
      return response.value;
    })),
    project: (value, summaries) => ({ ...value, summaries })
  });
  readonly state = this.results.state;
  readonly workflow = this.checks.workflow;
  readonly canConfirm = computed(() => this.workflow().canConfirm);
  readonly reviewError = computed(() => this.workflow().error);
  readonly savingReview = computed(() => this.workflow().saving);
  readonly checksRoute = computed(() => {
    const report = this.context.report();
    return report ? this.context.navigation.accountReportWorkbenchRoute(report.accountId, report.guid, 'data-checks') : this.context.dashboardRoute();
  });
  retry(): void {
    if (this.context.status.state() === 'error') this.injector.get(WorkspaceCalendarizationService).retry();
    this.results.retry(); this.checks.retry();
  }
  confirmReview(): Promise<void> { return this.checks.confirmReview(); }

  private async persistReview(value: AnalysisChecksResult): Promise<void> {
    const report = this.context.report()!;
    const boundary = this.injector.get(WorkspaceCommandBoundary);
    const handler = this.injector.get(AnalysisReviewCommandHandler);
    await boundary.execute({ entityKind: value.inputs.owner.scope === 'account' ? 'accountAnalysis' : 'facilityAnalysis', changeKind: 'update',
      entityGuid: value.inputs.owner.analysisGuid, label: 'Confirming analysis review', notification: { suppressSuccessToast: true },
      publication: { mode: 'patch', buildPatch: saved => ({ collections: [{ collection: saved.scope === 'account' ? 'accountAnalyses' : 'facilityAnalyses', upsert: [saved.analysis] }] }) }
    }, () => handler.confirm(report.accountId, report.betterPlantsReportSetup.analysisItemId, value.inputs, value.years));
  }

  private buildInput(): AnalysisChecksRequest {
    const report = this.context.report(), stage = this.context.stage(), workspace = this.context.workspace;
    const base = `${this.context.key()}:${stage}`;
    if (!report || report.reportType !== 'betterPlants' ) return { key: base, state: 'idle' };
    const wait = (message: string): AnalysisChecksRequest => ({ key: base, state: 'waiting', message });
    if (!workspace.isReady() || !workspace.canWrite() || workspace.hasPending()) return wait('Waiting for the account workspace…');
    if (!['idle', 'saved'].includes(this.editor.state())) return wait('Finish saving or discard the report changes before continuing.');
    if (this.context.status.state() === 'error') return { key: `${base}:status-error`, state: 'error', message: 'Workspace validation failed. Review the account status and retry.' };
    if (this.context.status.state() !== 'ready') return wait('Waiting for workspace validation…');
    if (stage === 'report' && this.context.findings().some(item => item.severity === 'error')) return { key: `${base}:blocked`, state: 'error', message: 'Complete report setup and resolve linked analysis errors before continuing.' };
    try {
      const inputs = buildAnalysisReportInputs(workspace.snapshot()!, report.betterPlantsReportSetup.analysisItemId);
      const years = reportYears(inputs.analysis.baselineYear, report.reportYear, report.betterPlantsReportSetup.includeAllYears === true);
      assertAnalysisReportYears(inputs, years);
      const owner = inputs.owner;
      const analysis = owner.scope === 'account' ? workspace.accountAnalyses().find(item => item.guid === owner.analysisGuid)
        : workspace.facilityAnalyses().find(item => item.guid === owner.analysisGuid && item.facilityId === owner.facilityGuid);
      const reviews = analysis?.dataCheckReviews ?? [];
      return { key: base, state: 'calculate', demand: stage === 'setup' ? 'freshness' : stage === 'data-checks' ? 'checks' : 'gate', inputs, years: [report.reportYear], reviews,
        blocking: this.context.findings().some(item => item.severity === 'error'),
        warnings: this.context.findings().some(item => item.severity === 'warning') };
    } catch (error) { return { key: `${base}:${String(error)}`, state: 'error', message: error instanceof Error ? error.message : 'Complete report setup before continuing.' }; }
  }

}
