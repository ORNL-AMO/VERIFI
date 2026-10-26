import { Injectable, Injector, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, concat, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { BetterPlantsSummary } from '@data/models/overview-report';
import { assertAnalysisReportYears, buildAnalysisReportInputs, reportYears } from '@domain/reports/analysis-report-inputs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { analysisReviewContent } from '@domain/reports/analysis-review-inputs';
import { AnalysisReportCalculationService } from '@app/v1/shared/reports/analysis-report-calculation.service';
import { AnalysisChecksController, AnalysisChecksRequest, AnalysisChecksResult } from '@app/v1/shared/reports/analysis-checks-controller';
import { ReportResultState } from '@app/v1/shared/reports/report-result-state';
import { AccountReportWorkbenchContext } from '../account-report-workbench/account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-workbench/account-report-autosave.service';

export interface BetterPlantsResult extends AnalysisChecksResult {
  readonly summaries?: readonly BetterPlantsSummary[];
}

@Injectable()
export class BetterPlantsReportService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly editor = inject(AccountReportAutosaveService);
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly injector = inject(Injector);
  private reportCache?: { readonly content: string; readonly value: readonly BetterPlantsSummary[] };
  private readonly input = computed<AnalysisChecksRequest>(() => this.buildInput());
  readonly checks = new AnalysisChecksController(this.input, value => this.persistReview(value));
  private readonly result = toSignal(toObservable(this.checks.state).pipe(
    distinctUntilChanged((a, b) => a === b),
    switchMap(result => {
      if (result.state !== 'ready' || !result.value || this.context.stage() !== 'report') return of(result);
      const value = result.value;
      if (!value.completed) return of<ReportResultState<BetterPlantsResult>>({ ...result, state: 'review-required',
        message: value.blocked ? 'Resolve critical analysis issues before displaying this report.' : 'Review the current analysis checks and acknowledge the issues before displaying this report.' });
      const content = JSON.stringify(value.years.map(year => analysisReviewContent(value.inputs, year)));
      if (this.reportCache?.content === content) return of({ ...result, value: { ...value, summaries: this.reportCache.value } });
      return concat(of<ReportResultState<BetterPlantsResult>>({ key: result.key, state: 'loading', message: 'Preparing the Better Plants report…' }),
        this.calculations.execute({ operation: 'better-plants', inputs: value.inputs, years: value.years }).pipe(map(response => {
          if (response.ok === false) throw new Error(response.message);
          if (response.operation !== 'better-plants') throw new Error('Report processing returned an unexpected result.');
          this.reportCache = { content, value: response.value };
          return { ...result, value: { ...value, summaries: response.value } };
        }), catchError(error => of<ReportResultState<BetterPlantsResult>>({ key: result.key, state: 'error', message: error instanceof Error ? error.message : 'Report processing failed. Try again.' }))));
    })
  ), { initialValue: { key: '', state: 'idle' } as ReportResultState<BetterPlantsResult> });
  readonly state = computed<ReportResultState<BetterPlantsResult>>(() => {
    const checks = this.checks.state(), result = this.result();
    return result.key === checks.key ? result : { key: checks.key, state: checks.state === 'error' ? 'error' : 'waiting', message: checks.message ?? 'Checking the current analysis inputs…' };
  });
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
    this.reportCache = undefined; this.checks.retry();
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
      return { key: base, state: 'calculate', demand: stage === 'setup' ? 'freshness' : stage === 'data-checks' ? 'checks' : 'gate', inputs, years, reviews,
        blocking: this.context.findings().some(item => item.severity === 'error'),
        warnings: this.context.findings().some(item => item.severity === 'warning') };
    } catch (error) { return { key: `${base}:${String(error)}`, state: 'error', message: error instanceof Error ? error.message : 'Complete report setup before continuing.' }; }
  }

}
