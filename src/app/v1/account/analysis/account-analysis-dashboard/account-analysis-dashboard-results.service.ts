import { computed, inject, Injectable, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { calculateAccountAnalysisDashboardResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import {
  AccountAnalysisResultsWorkerRequest,
  AccountAnalysisResultsWorkerResponse
} from '@platform/web-workers/account-analysis-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import {
  Observable,
  catchError,
  defer,
  distinctUntilChanged,
  from,
  map,
  mergeMap,
  of,
  scan,
  startWith,
  switchMap,
  tap,
  timeout
} from 'rxjs';
import { analysisOutcomeSummary } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import {
  AccountAnalysisDashboardResultState,
  buildAccountAnalysisFacilitySelections
} from './account-analysis.models';
import {
  accountAnalysisResultsFingerprint,
  buildAccountAnalysisResultsRequest
} from '../results/account-analysis-results-request';

interface DashboardResultRequest {
  readonly analysisGuid: string;
  readonly fingerprint: string;
  readonly request: AccountAnalysisResultsWorkerRequest;
}

interface DashboardResultInput {
  readonly key: string;
  readonly states: Readonly<Record<string, AccountAnalysisDashboardResultState>>;
  readonly requests: readonly DashboardResultRequest[];
}

interface DashboardResultUpdate {
  readonly analysisGuid: string;
  readonly state: AccountAnalysisDashboardResultState;
}

interface CachedDashboardResult {
  readonly fingerprint: string;
  readonly state: Extract<AccountAnalysisDashboardResultState, { readonly state: 'ready' }>;
}

@Injectable()
export class AccountAnalysisDashboardResultsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly cache = new Map<string, CachedDashboardResult>();
  private readonly input = computed<DashboardResultInput>(() => this.buildInput());
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (!input.requests.length) return of(input.states);
      return from(input.requests).pipe(
        mergeMap(request => this.calculate(request), 2),
        scan((states, update) => ({ ...states, [update.analysisGuid]: update.state }), input.states),
        startWith(input.states)
      );
    })
  );

  readonly states: Signal<Readonly<Record<string, AccountAnalysisDashboardResultState>>> = toSignal(
    this.stateStream,
    { initialValue: {} }
  );

  private buildInput(): DashboardResultInput {
    const analyses = [...this.workspace.accountAnalyses()].sort((first, second) => first.guid.localeCompare(second.guid));
    const snapshot = this.workspace.snapshot();
    const stateEntries: Array<readonly [string, AccountAnalysisDashboardResultState]> = [];
    const requests: DashboardResultRequest[] = [];
    const keyParts: string[] = [];
    const scopeKey = analyses.map(analysis => analysis.guid).join(',');

    if (!snapshot || !this.workspace.isReady()) {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'loading', message: 'Preparing data…' }]));
      return dashboardInput(stateEntries, requests, `workspace:${this.workspace.status()}:${scopeKey}`);
    }
    if (this.status.state() === 'error') {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'error', message: 'Validation failed' }]));
      return dashboardInput(stateEntries, requests, `status:error:${snapshot.account.guid}:${scopeKey}`);
    }
    if (this.status.state() !== 'ready') {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'loading', message: 'Checking readiness…' }]));
      return dashboardInput(stateEntries, requests, `status:${this.status.state()}:${snapshot.account.guid}:${scopeKey}`);
    }

    analyses.forEach(analysis => {
      if (this.hasBlockingErrors(analysis.guid)) {
        stateEntries.push([analysis.guid, { state: 'blocked', message: 'Setup incomplete' }]);
        keyParts.push(`${analysis.guid}:blocked`);
        return;
      }
      const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
      const fingerprint = accountAnalysisResultsFingerprint(request);
      const cached = this.cache.get(analysis.guid);
      if (cached?.fingerprint === fingerprint) {
        stateEntries.push([analysis.guid, cached.state]);
      } else {
        stateEntries.push([analysis.guid, { state: 'loading', message: 'Calculating…' }]);
        requests.push({ analysisGuid: analysis.guid, fingerprint, request });
      }
      keyParts.push(`${analysis.guid}:${fingerprint}`);
    });
    return dashboardInput(stateEntries, requests, `${snapshot.account.guid}|${keyParts.join('|')}`);
  }

  private calculate(input: DashboardResultRequest): Observable<DashboardResultUpdate> {
    const response$ = defer(() => typeof Worker !== 'undefined'
      ? runWorker<AccountAnalysisResultsWorkerResponse>(
          new Worker(new URL('../../../../platform/web-workers/account-analysis-dashboard-results.worker', import.meta.url)),
          input.request
        )
      : of<AccountAnalysisResultsWorkerResponse>({
          ok: true,
          value: calculateAccountAnalysisDashboardResults(input.request)
        }));
    return response$.pipe(
      timeout(CALCULATION_WORKER_TIMEOUT_MS),
      map(response => ({ analysisGuid: input.analysisGuid, state: outcomeState(response, input) })),
      tap(update => {
        if (update.state.state === 'ready') {
          this.cache.set(update.analysisGuid, { fingerprint: input.fingerprint, state: update.state });
        }
      }),
      catchError(() => of({
        analysisGuid: input.analysisGuid,
        state: { state: 'error' as const, message: 'Calculation failed' }
      }))
    );
  }

  private hasBlockingErrors(analysisGuid: string): boolean {
    const analysis = this.workspace.accountAnalyses().find(item => item.guid === analysisGuid);
    const snapshot = this.workspace.snapshot();
    if (!analysis || !snapshot) return true;
    const hasBlockingSelection = buildAccountAnalysisFacilitySelections(
      analysis,
      snapshot.facilities,
      snapshot.facilityAnalyses
    ).some(selection => selection.state === 'missing' || selection.state === 'invalid');
    if (hasBlockingSelection) return true;
    const selectedGuids = new Set((analysis.facilityAnalysisItems ?? [])
      .map(item => item.analysisItemId)
      .filter((guid): guid is string => !!guid && guid !== 'skip'));
    return this.status.items().some(item => item.severity === 'error' && (
      (item.entity.kind === 'account-analysis' && item.entity.guid === analysisGuid)
      || (item.entity.kind === 'facility-analysis' && selectedGuids.has(item.entity.guid))
      || (item.entity.kind === 'analysis-group'
        && [...selectedGuids].some(guid => item.entity.guid.startsWith(`${guid}:`)))
    ));
  }
}

function outcomeState(
  response: AccountAnalysisResultsWorkerResponse,
  input: DashboardResultRequest
): AccountAnalysisDashboardResultState {
  if (response.ok === false || response.value.itemId !== input.analysisGuid) {
    return { state: 'error', message: 'Calculation failed' };
  }
  return {
    state: 'ready',
    annualAnalysisSummaries: response.value.annualAnalysisSummaries,
    reportYear: response.value.reportYear,
    summary: analysisOutcomeSummary(
      response.value.annualAnalysisSummaries,
      response.value.monthlyAnalysisSummaryData,
      response.value.reportYear,
      input.request.account
    )
  };
}

function dashboardInput(
  entries: Array<readonly [string, AccountAnalysisDashboardResultState]>,
  requests: readonly DashboardResultRequest[],
  key: string
): DashboardResultInput {
  return { key, states: Object.fromEntries(entries), requests };
}
