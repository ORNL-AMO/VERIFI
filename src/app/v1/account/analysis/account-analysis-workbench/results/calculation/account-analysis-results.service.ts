import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import {
  AccountAnalysisResultsValue,
  AccountAnalysisResultsWorkerRequest,
  AccountAnalysisResultsWorkerResponse
} from '@platform/web-workers/account-analysis-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { Observable, catchError, concat, defer, distinctUntilChanged, map, of, switchMap, tap, timeout } from 'rxjs';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../../editing/account-analysis-autosave.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { accountAnalysisResultsFingerprint, buildAccountAnalysisResultsRequest } from '@app/v1/account/analysis/results/account-analysis-results-request';

export type AccountAnalysisWaitingReason = 'workspace' | 'autosave' | 'status' | 'blocked';

export type AccountAnalysisResultState =
  | { readonly state: 'idle'; readonly analysisGuid?: string }
  | { readonly state: 'waiting'; readonly analysisGuid: string; readonly reason: AccountAnalysisWaitingReason }
  | { readonly state: 'loading'; readonly analysisGuid: string; readonly fingerprint: string }
  | {
    readonly state: 'ready'; readonly analysisGuid: string; readonly fingerprint: string;
    readonly annual: readonly AnnualAnalysisSummary[];
    readonly monthly: readonly MonthlyAnalysisSummaryData[];
    readonly reportYear?: number;
  }
  | { readonly state: 'error'; readonly analysisGuid: string; readonly fingerprint: string; readonly message: string };

type ResultInput =
  | { readonly key: string; readonly state: 'idle'; readonly analysisGuid?: string }
  | { readonly key: string; readonly state: 'waiting'; readonly analysisGuid: string; readonly reason: AccountAnalysisWaitingReason }
  | { readonly key: string; readonly state: 'ready'; readonly analysisGuid: string; readonly fingerprint: string; readonly request: AccountAnalysisResultsWorkerRequest };

@Injectable()
export class AccountAnalysisResultsService {
  private readonly context = inject(AccountAnalysisWorkbenchContext);
  private readonly autosave = inject(AccountAnalysisAutosaveService);
  private readonly selection = inject(AccountAnalysisFacilitySelectionService);
  private readonly cache = new Map<string, Extract<AccountAnalysisResultState, { readonly state: 'ready' }>>();
  private readonly input = computed<ResultInput>(() => this.buildInput());
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (input.state === 'idle') return of<AccountAnalysisResultState>({ state: 'idle', analysisGuid: input.analysisGuid });
      if (input.state === 'waiting') return of<AccountAnalysisResultState>({ state: 'waiting', analysisGuid: input.analysisGuid, reason: input.reason });
      const cached = this.cache.get(input.fingerprint);
      if (cached) return of(cached);
      return concat(
        of<AccountAnalysisResultState>({ state: 'loading', analysisGuid: input.analysisGuid, fingerprint: input.fingerprint }),
        this.calculate(input.request, input.fingerprint).pipe(tap(state => {
          if (state.state !== 'ready') return;
          for (const [key, value] of this.cache) if (value.analysisGuid === state.analysisGuid) this.cache.delete(key);
          this.cache.set(input.fingerprint, state);
        }))
      );
    })
  );

  readonly state: Signal<AccountAnalysisResultState> = toSignal(this.stateStream, { initialValue: { state: 'idle' } });

  private buildInput(): ResultInput {
    const analysis = this.autosave.draft() || this.context.analysis();
    if (!analysis) return { key: 'idle', state: 'idle' };
    const analysisGuid = analysis.guid;
    const snapshot = this.context.workspace.snapshot();
    if (!snapshot || !this.context.workspace.isReady() || !this.context.workspace.canWrite() || this.context.workspace.hasPending()) {
      return waiting(analysisGuid, 'workspace');
    }
    if (!['idle', 'saved'].includes(this.autosave.state())) return waiting(analysisGuid, 'autosave');
    if (this.context.status.state() !== 'ready') return waiting(analysisGuid, 'status');
    if (this.context.hasBlockingErrors() || !this.selection.resultsReady()) return waiting(analysisGuid, 'blocked');
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    const fingerprint = accountAnalysisResultsFingerprint(request);
    return { key: `ready:${fingerprint}`, state: 'ready', analysisGuid, fingerprint, request };
  }

  private calculate(request: AccountAnalysisResultsWorkerRequest, fingerprint: string): Observable<AccountAnalysisResultState> {
    const response$ = defer(() => typeof Worker !== 'undefined'
      ? runWorker<AccountAnalysisResultsWorkerResponse>(
        new Worker(new URL('../../../../../../platform/web-workers/account-analysis-workbench-results.worker', import.meta.url)),
        request
      )
      : of<AccountAnalysisResultsWorkerResponse>({ ok: true, value: calculateAccountAnalysisResults(request) }));
    return response$.pipe(
      timeout(CALCULATION_WORKER_TIMEOUT_MS),
      map(response => normalizeAccountAnalysisWorkerResponse(response, request.accountAnalysisItem.guid, fingerprint)),
      catchError(error => of({
        state: 'error' as const,
        analysisGuid: request.accountAnalysisItem.guid,
        fingerprint,
        message: error instanceof Error ? error.message : 'Account analysis calculation failed.'
      }))
    );
  }
}

export function normalizeAccountAnalysisWorkerResponse(
  response: AccountAnalysisResultsWorkerResponse,
  analysisGuid: string,
  fingerprint: string
): AccountAnalysisResultState {
  if (response.ok === false) return { state: 'error', analysisGuid, fingerprint, message: response.message };
  return normalizeAccountAnalysisValue(response.value, analysisGuid, fingerprint);
}

function normalizeAccountAnalysisValue(value: AccountAnalysisResultsValue, analysisGuid: string, fingerprint: string): AccountAnalysisResultState {
  if (value.itemId !== analysisGuid) {
    return { state: 'error', analysisGuid, fingerprint, message: 'Account analysis calculation returned a stale result.' };
  }
  return {
    state: 'ready', analysisGuid, fingerprint,
    annual: value.annualAnalysisSummaries,
    monthly: value.monthlyAnalysisSummaryData,
    reportYear: value.reportYear
  };
}

function waiting(analysisGuid: string, reason: AccountAnalysisWaitingReason): ResultInput {
  return { key: `waiting:${analysisGuid}:${reason}`, state: 'waiting', analysisGuid, reason };
}
