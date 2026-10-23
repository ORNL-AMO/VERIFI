import { Injectable, Injector, PendingTasks, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, concat, defer, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { AnalysisDataCheckReview } from '@data/models/analysis-review';
import { BetterPlantsSummary } from '@data/models/overview-report';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { AnalysisReportInputs, assertAnalysisReportYears, buildAnalysisReportInputs, reportYears } from '@domain/reports/analysis-report-inputs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { analysisReviewContent, analysisReviewIsCurrent } from '@domain/reports/analysis-review-inputs';
import { AnalysisReportCalculationService } from '@app/v1/shared/reports/analysis-report-calculation.service';
import { ReportResultState } from '@app/v1/shared/reports/report-result-state';
import { AccountReportWorkbenchContext } from '../account-report-workbench/account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-workbench/account-report-autosave.service';

export interface BetterPlantsResult {
  readonly inputs: AnalysisReportInputs;
  readonly years: readonly number[];
  readonly fingerprints: readonly string[];
  readonly checks?: readonly AnalysisDataChecks[];
  readonly summaries?: readonly BetterPlantsSummary[];
  readonly reviewed: boolean;
}
interface ReportInput {
  readonly key: string;
  readonly state: 'idle' | 'waiting' | 'error' | 'calculate';
  readonly message?: string;
  readonly stage?: 'setup' | 'data-checks' | 'report';
  readonly inputs?: AnalysisReportInputs;
  readonly years?: readonly number[];
  readonly contents?: readonly string[];
  readonly reviews?: readonly AnalysisDataCheckReview[];
}

@Injectable()
export class BetterPlantsReportService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly editor = inject(AccountReportAutosaveService);
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly injector = inject(Injector);
  private readonly attempt = signal(0);
  private readonly pendingTasks = inject(PendingTasks);
  readonly savingReview = signal(false);
  private readonly reviewFailure = signal<{ key: string; message: string } | undefined>(undefined);
  readonly reviewError = computed(() => this.reviewFailure()?.key === this.context.key() ? this.reviewFailure()?.message : undefined);
  private checkCache?: { readonly content: string; readonly value: readonly AnalysisDataChecks[] };
  private reportCache?: { readonly content: string; readonly value: readonly BetterPlantsSummary[] };
  private readonly input = computed<ReportInput>(() => this.buildInput());
  private readonly result = toSignal(toObservable(this.input).pipe(
    distinctUntilChanged((a, b) => a.key === b.key),
    switchMap(input => {
      if (input.state !== 'calculate') return of<ReportResultState<BetterPlantsResult>>({ key: input.key, state: input.state, message: input.message });
      return concat(of<ReportResultState<BetterPlantsResult>>({ key: input.key, state: 'loading', message: 'Checking the current analysis inputs…' }),
        defer(() => {
          const complete = this.pendingTasks.add();
          return from(Promise.all(input.contents!.map(content => this.calculations.fingerprint(content))).finally(complete));
        }).pipe(
          switchMap(fingerprints => this.calculate(input, fingerprints)),
          catchError(error => of<ReportResultState<BetterPlantsResult>>({ key: input.key, state: 'error', message: error instanceof Error ? error.message : 'Report processing failed. Try again.' }))
        ));
    })
  ), { initialValue: { key: '', state: 'idle' } as ReportResultState<BetterPlantsResult> });
  /** Hide stale values synchronously, before the Observable observes a new input. */
  readonly state = computed<ReportResultState<BetterPlantsResult>>(() => {
    const input = this.input(), result = this.result();
    return result.key === input.key ? result : { key: input.key, state: input.state === 'error' ? 'error' : 'waiting', message: input.message ?? 'Checking the current analysis inputs…' };
  });
  readonly checksRoute = computed(() => {
    const report = this.context.report();
    return report ? this.context.navigation.accountReportWorkbenchRoute(report.accountId, report.guid, 'data-checks') : this.context.dashboardRoute();
  });
  readonly canConfirm = computed(() => {
    const result = this.state();
    return result.state === 'ready' && !!result.value?.checks?.length && !result.value.reviewed
      && !result.value.checks.some(check => check.hasBlockingErrors) && !this.context.findings().some(item => item.severity === 'error') && !this.savingReview() && this.context.workspace.canWrite() && !this.context.workspace.hasPending();
  });

  retry(): void {
    if (this.context.status.state() === 'error') this.injector.get(WorkspaceCalendarizationService).retry();
    this.checkCache = undefined; this.reportCache = undefined; this.attempt.update(value => value + 1);
  }
  async confirmReview(): Promise<void> {
    const result = this.state();
    if (!this.canConfirm() || !result.value) return;
    const value = result.value, report = this.context.report()!, key = this.context.key();
    this.savingReview.set(true); this.reviewFailure.set(undefined);
    try {
      const boundary = this.injector.get(WorkspaceCommandBoundary);
      const handler = this.injector.get(AnalysisReviewCommandHandler);
      await boundary.execute({ entityKind: value.inputs.owner.scope === 'account' ? 'accountAnalysis' : 'facilityAnalysis', changeKind: 'update',
        entityGuid: value.inputs.owner.analysisGuid, label: 'Confirming analysis review', notification: { suppressSuccessToast: true },
        publication: { mode: 'patch', buildPatch: saved => ({ collections: [{ collection: saved.scope === 'account' ? 'accountAnalyses' : 'facilityAnalyses', upsert: [saved.analysis] }] }) }
      }, () => handler.confirm(report.accountId, report.betterPlantsReportSetup.analysisItemId, value.inputs, value.years));
    } catch (error) {
      if (key === this.context.key()) this.reviewFailure.set({ key, message: error instanceof Error ? error.message : 'The review could not be saved. Try again.' });
    } finally { this.savingReview.set(false); }
  }

  private buildInput(): ReportInput {
    const report = this.context.report(), stage = this.context.stage(), workspace = this.context.workspace;
    const base = `${this.context.key()}:${stage}:${this.attempt()}`;
    if (!report || report.reportType !== 'betterPlants' ) return { key: base, state: 'idle' };
    const wait = (message: string): ReportInput => ({ key: `${base}:${message}`, state: 'waiting', message });
    if (!workspace.isReady() || !workspace.canWrite() || workspace.hasPending()) return wait(this.savingReview() ? 'Saving your review…' : 'Waiting for the account workspace…');
    if (!['idle', 'saved'].includes(this.editor.state())) return wait('Finish saving or discard the report changes before continuing.');
    if (this.context.status.state() === 'error') return { key: `${base}:status-error`, state: 'error', message: 'Workspace validation failed. Review the account status and retry.' };
    if (this.context.status.state() !== 'ready') return wait('Waiting for workspace validation…');
    if (stage === 'report' && this.context.findings().some(item => item.severity === 'error')) return { key: `${base}:blocked`, state: 'error', message: 'Complete report setup and resolve linked analysis errors before continuing.' };
    try {
      const inputs = buildAnalysisReportInputs(workspace.snapshot()!, report.betterPlantsReportSetup.analysisItemId);
      const years = reportYears(inputs.analysis.baselineYear, report.reportYear, report.betterPlantsReportSetup.includeAllYears === true);
      assertAnalysisReportYears(inputs, years);
      const contents = years.map(year => analysisReviewContent(inputs, year));
      const owner = inputs.owner;
      const analysis = owner.scope === 'account' ? workspace.accountAnalyses().find(item => item.guid === owner.analysisGuid)
        : workspace.facilityAnalyses().find(item => item.guid === owner.analysisGuid && item.facilityId === owner.facilityGuid);
      const reviews = analysis?.dataCheckReviews ?? [];
      return { key: JSON.stringify([base, contents, reviews]), state: 'calculate', stage, inputs, years, contents, reviews };
    } catch (error) { return { key: `${base}:${String(error)}`, state: 'error', message: error instanceof Error ? error.message : 'Complete report setup before continuing.' }; }
  }

  private calculate(input: ReportInput, fingerprints: readonly string[]): Observable<ReportResultState<BetterPlantsResult>> {
    const reviewed = input.years!.every((year, index) => analysisReviewIsCurrent(input.reviews, year, fingerprints[index]));
    const value: BetterPlantsResult = { inputs: input.inputs!, years: input.years!, fingerprints, reviewed };
    if (input.stage === 'setup') return of({ key: input.key, state: 'ready', value });
    if (input.stage === 'report' && !reviewed) return of({ key: input.key, state: 'review-required', value, message: 'Review required. Confirm the current analysis checks before displaying this report. Dependent data or the reporting period may have changed.' });
    const content = JSON.stringify(input.contents), checks = input.stage === 'data-checks';
    const cached = checks ? this.checkCache : this.reportCache;
    if (cached?.content === content) return of({ key: input.key, state: 'ready', value: { ...value,
      ...(checks ? { checks: cached.value as readonly AnalysisDataChecks[] } : { summaries: cached.value as readonly BetterPlantsSummary[] }) } });
    return this.calculations.execute({ operation: checks ? 'checks' : 'better-plants', inputs: input.inputs!, years: input.years! }).pipe(map(response => {
      if (response.ok === false) throw new Error(response.message);
      if (response.operation === 'checks') { this.checkCache = { content, value: response.value }; return { key: input.key, state: 'ready' as const, value: { ...value, checks: response.value } }; }
      this.reportCache = { content, value: response.value }; return { key: input.key, state: 'ready' as const, value: { ...value, summaries: response.value } };
    }));
  }
}
