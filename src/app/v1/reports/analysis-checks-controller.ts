import { PendingTasks, Signal, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, concat, defer, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';
import { AnalysisDataCheckReview } from '@data/models/analysis-review';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { AnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReviewContent, analysisReviewIsCurrent } from '@domain/reports/analysis-review-inputs';
import { AnalysisReportCalculationService } from './analysis-report-calculation.service';
import { AnalysisChecksWorkflow, summarizeAnalysisChecks } from './analysis-checks.models';
import { ReportResultState } from './report-result-state';

export interface AnalysisChecksRequest {
  readonly key: string;
  readonly state: 'idle' | 'waiting' | 'error' | 'calculate';
  readonly message?: string;
  readonly demand?: 'freshness' | 'checks' | 'gate';
  readonly inputs?: AnalysisReportInputs;
  readonly years?: readonly number[];
  readonly reviews?: readonly AnalysisDataCheckReview[];
  readonly blocking?: boolean;
  readonly warnings?: boolean;
}
export interface AnalysisChecksResult {
  readonly inputs: AnalysisReportInputs;
  readonly years: readonly number[];
  readonly fingerprints: readonly string[];
  readonly checks?: readonly AnalysisDataChecks[];
  readonly reviewed: boolean;
  readonly completed: boolean;
  readonly blocked: boolean;
}

/** Construct in the owning workbench's injection context. Adapters own report selection and writes. */
export class AnalysisChecksController {
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly attempt = signal(0);
  private readonly saving = signal(false);
  private readonly failure = signal<{ key: string; message: string } | undefined>(undefined);
  private cache?: { content: string; checks: readonly AnalysisDataChecks[] };
  private readonly input = computed(() => {
    const request = this.request();
    const contents = request.inputs && request.years ? request.years.map(year => analysisReviewContent(request.inputs!, year)) : [];
    const content = JSON.stringify(contents);
    return { ...request, contents, content,
      key: JSON.stringify([request.key, request.state, request.message, request.demand, content, request.reviews, request.blocking, request.warnings, this.attempt()]) };
  });
  private readonly result = toSignal(toObservable(this.input).pipe(
    distinctUntilChanged((a, b) => a.key === b.key),
    switchMap(input => {
      if (input.state !== 'calculate') return of<ReportResultState<AnalysisChecksResult>>({ key: input.key, state: input.state, message: input.message });
      return concat(of<ReportResultState<AnalysisChecksResult>>({ key: input.key, state: 'loading', message: 'Checking the current analysis inputs…' }),
        defer(() => {
          const complete = this.pendingTasks.add();
          return from(Promise.all(input.contents.map(content => this.calculations.fingerprint(content))).finally(complete));
        }).pipe(
          switchMap(fingerprints => {
            const reviewed = !!input.years?.length && input.years.every((year, index) => analysisReviewIsCurrent(input.reviews, year, fingerprints[index]));
            const base = { inputs: input.inputs!, years: input.years!, fingerprints, reviewed };
            const project = (checks?: readonly AnalysisDataChecks[]): ReportResultState<AnalysisChecksResult> => {
              const summary = checks ? summarizeAnalysisChecks(checks, input.years!) : undefined;
              const blocked = !!input.blocking || !!summary?.blocked;
              const completed = !blocked && (reviewed || (!!summary && !summary.hasIssues && !input.warnings));
              return { key: input.key, state: 'ready', value: { ...base, checks, blocked, completed } };
            };
            if (this.cache?.content === input.content) return of(project(this.cache.checks));
            if (input.demand === 'freshness') return of(project());
            if (input.demand === 'gate' && reviewed) return of(project());
            return this.calculations.execute({ operation: 'checks', inputs: input.inputs!, years: input.years! }).pipe(map(response => {
              if (response.ok === false) throw new Error(response.message);
              if (response.operation !== 'checks') throw new Error('Analysis checks returned an unexpected result.');
              this.cache = { content: input.content, checks: response.value };
              return project(response.value);
            }));
          }),
          catchError(error => of<ReportResultState<AnalysisChecksResult>>({ key: input.key, state: 'error', message: error instanceof Error ? error.message : 'Analysis checks failed. Try again.' }))
        ));
    })
  ), { initialValue: { key: '', state: 'idle' } as ReportResultState<AnalysisChecksResult> });
  readonly state = computed<ReportResultState<AnalysisChecksResult>>(() => {
    const input = this.input(), result = this.result();
    return result.key === input.key ? result : { key: input.key, state: input.state === 'error' ? 'error' : 'waiting', message: input.message ?? 'Checking the current analysis inputs…' };
  });
  readonly workflow = computed<AnalysisChecksWorkflow>(() => {
    const state = this.state(), input = this.input(), saving = this.saving();
    const value = state.state === 'ready' ? state.value : undefined;
    const completed = !!value?.completed && !saving;
    const blocked = !!value?.blocked || !!input.blocking;
    return { key: this.request().key, completed, saving, blocked,
      canConfirm: !!value?.checks?.length && !completed && !blocked && !saving,
      error: this.failure()?.key === input.key ? this.failure()?.message : undefined,
      message: saving ? 'Saving your review…' : blocked ? 'Resolve critical issues before continuing.'
        : state.state !== 'ready' ? state.message : !completed ? 'Review the issues and acknowledge them before continuing.' : undefined };
  });

  constructor(private readonly request: Signal<AnalysisChecksRequest>,
    private readonly persist: (displayed: AnalysisChecksResult) => Promise<unknown>) { }

  retry(): void { this.cache = undefined; this.failure.set(undefined); this.attempt.update(value => value + 1); }

  async confirmReview(): Promise<void> {
    const state = this.state();
    if (!this.workflow().canConfirm || !state.value) return;
    const key = state.key;
    this.saving.set(true); this.failure.set(undefined);
    try { await this.persist(state.value); }
    catch (error) {
      if (this.input().key === key) this.failure.set({ key, message: error instanceof Error ? error.message : 'The review could not be saved. Try again.' });
    } finally { this.saving.set(false); }
  }
}
