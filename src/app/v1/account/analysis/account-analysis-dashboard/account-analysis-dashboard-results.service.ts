import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { calculateAccountAnalysisDashboardResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import { calculateFacilityAnalysisOutcomeResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { AccountAnalysisResultsWorkerRequest, AccountAnalysisResultsWorkerResponse } from '@platform/web-workers/account-analysis-results-worker.contract';
import { FacilityAnalysisResultsWorkerRequest, FacilityAnalysisResultsWorkerResponse } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { Observable, catchError, defer, distinctUntilChanged, map, of, tap, timeout } from 'rxjs';
import { analysisOutcomeSummary } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { buildFacilityDashboardResultsRequest, facilityAnalysisResultsFingerprint } from '@app/v1/facility/analysis/facility-analysis-workbench/results/calculation/facility-analysis-results-request';
import { AccountAnalysisDashboardResultState, buildAccountAnalysisFacilitySelections } from './account-analysis.models';
import { accountAnalysisResultsFingerprint, buildAccountAnalysisResultsRequest } from '../results/account-analysis-results-request';
import { scheduleAnalysisResults } from '@app/v1/shared/analysis-inventory/analysis-results-scheduler';
import { AnalysisInventoryEntry } from '@app/v1/shared/analysis-inventory/analysis-inventory.models';

type ResultState = AccountAnalysisDashboardResultState;
type Job = { readonly accountGuid: string; readonly key: string; readonly fingerprint: string } & (
  | { readonly scope: 'account'; readonly request: AccountAnalysisResultsWorkerRequest }
  | { readonly scope: 'facility'; readonly request: FacilityAnalysisResultsWorkerRequest });
interface ResultInput { readonly key: string; readonly states: Readonly<Record<string, ResultState>>; readonly jobs: readonly Job[]; }

/** One demand-bounded queue for both scopes; simple/off-page cards never enqueue analysis work. */
@Injectable()
export class AccountAnalysisDashboardResultsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly base = toSignal(this.calendarization.calendarizeBase(), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  private readonly demand = signal<readonly AnalysisInventoryEntry[]>([]);
  private readonly cache = new Map<string, { fingerprint: string; state: ResultState }>();
  private readonly input = computed(() => this.buildInput());
  readonly states = toSignal(scheduleAnalysisResults(toObservable(this.input).pipe(
    distinctUntilChanged((a, b) => a.key === b.key)
  ), job => this.calculate(job)), { initialValue: {} as Readonly<Record<string, ResultState>> });

  setDemand(entries: readonly AnalysisInventoryEntry[]): void { this.demand.set(entries); }

  private buildInput(): ResultInput {
    const snapshot = this.workspace.snapshot();
    const states: Record<string, ResultState> = {};
    const jobs: Job[] = [];
    const keys: string[] = [snapshot?.account.guid ?? '', this.workspace.status()];
    const base = this.base();
    for (const entry of [...this.demand()].sort((a, b) => a.key.localeCompare(b.key))) {
      const analysis = entry.card.analysis;
      let state: ResultState | undefined;
      let job: Job | undefined;
      if (!snapshot || !this.workspace.isReady() || analysis.accountId !== snapshot.account.guid) state = { state: 'loading', message: 'Preparing data…' };
      else if (this.status.state() === 'error') state = { state: 'error', message: 'Validation failed' };
      else if (this.status.state() !== 'ready') state = { state: 'loading', message: 'Checking readiness…' };
      else if (entry.card.status === 'error' || this.hasBlockingErrors(entry)) state = { state: 'blocked', message: 'Setup incomplete' };
      else if (entry.scope === 'account') {
        const request = buildAccountAnalysisResultsRequest(entry.card.analysis, snapshot);
        job = { accountGuid: snapshot.account.guid, key: entry.key, scope: 'account', request, fingerprint: accountAnalysisResultsFingerprint(request) };
      } else if (base.state === 'error') state = { state: 'error', message: 'Calculation data unavailable' };
      else if (base.state !== 'ready' || base.accountGuid !== snapshot.account.guid || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) state = { state: 'loading', message: 'Preparing data…' };
      else {
        const request = buildFacilityDashboardResultsRequest(entry.card.analysis, entry.facility, snapshot, projection => this.calendarization.project(base, projection));
        if (request) job = { accountGuid: snapshot.account.guid, key: entry.key, scope: 'facility', request, fingerprint: facilityAnalysisResultsFingerprint(request) };
        else state = { state: 'error', message: 'Calculation data unavailable' };
      }
      if (job) {
        const cacheKey = `${snapshot.account.guid}:${job.key}`;
        const cached = this.cache.get(cacheKey);
        state = cached?.fingerprint === job.fingerprint ? cached.state : { state: 'loading', message: 'Calculating…' };
        if (cached?.fingerprint !== job.fingerprint) jobs.push(job);
        keys.push(`${job.key}:${job.fingerprint}`);
      } else keys.push(`${entry.key}:${JSON.stringify(state)}`);
      states[entry.key] = state!;
    }
    return { key: keys.join('|'), states, jobs };
  }

  private calculate(job: Job): Observable<{ key: string; state: ResultState }> {
    const response$: Observable<AccountAnalysisResultsWorkerResponse | FacilityAnalysisResultsWorkerResponse> = defer(() => {
      if (job.scope === 'account') return typeof Worker !== 'undefined'
        ? runWorker<AccountAnalysisResultsWorkerResponse>(new Worker(new URL('../../../../platform/web-workers/account-analysis-dashboard-results.worker', import.meta.url)), job.request)
        : of({ ok: true as const, value: calculateAccountAnalysisDashboardResults(job.request) });
      return typeof Worker !== 'undefined'
        ? runWorker<FacilityAnalysisResultsWorkerResponse>(new Worker(new URL('../../../../platform/web-workers/facility-analysis-dashboard-results.worker', import.meta.url)), job.request)
        : of({ ok: true as const, value: calculateFacilityAnalysisOutcomeResults(job.request) });
    });
    return response$.pipe(
      timeout(CALCULATION_WORKER_TIMEOUT_MS),
      map(response => {
        const guid = job.scope === 'account' ? job.request.accountAnalysisItem.guid : job.request.analysisItem.guid;
        const state: ResultState = !response.ok || response.value.itemId !== guid ? { state: 'error', message: 'Calculation failed' } : {
          state: 'ready', annualAnalysisSummaries: response.value.annualAnalysisSummaries, reportYear: response.value.reportYear,
          summary: analysisOutcomeSummary(response.value.annualAnalysisSummaries, response.value.monthlyAnalysisSummaryData,
            response.value.reportYear, job.scope === 'account' ? job.request.account : job.request.facility)
        };
        return { key: job.key, state };
      }),
      tap(update => { if (update.state.state === 'ready') this.cache.set(`${job.accountGuid}:${job.key}`, { fingerprint: job.fingerprint, state: update.state }); }),
      catchError(() => of({ key: job.key, state: { state: 'error' as const, message: 'Calculation failed' } }))
    );
  }

  private hasBlockingErrors(entry: AnalysisInventoryEntry): boolean {
    const snapshot = this.workspace.snapshot();
    if (!snapshot) return true;
    const guids = new Set<string>();
    if (entry.scope === 'account') {
      if (buildAccountAnalysisFacilitySelections(entry.card.analysis, snapshot.facilities, snapshot.facilityAnalyses).some(selection => selection.state === 'missing' || selection.state === 'invalid')) return true;
      entry.card.analysis.facilityAnalysisItems?.forEach(link => { if (link.analysisItemId && link.analysisItemId !== 'skip') guids.add(link.analysisItemId); });
    } else guids.add(entry.card.analysis.guid);
    return this.status.items().some(item => item.severity === 'error' && (
      (entry.scope === 'account' && item.entity.kind === 'account-analysis' && item.entity.guid === entry.card.analysis.guid)
      || (item.entity.kind === 'facility-analysis' && guids.has(item.entity.guid))
      || (item.entity.kind === 'analysis-group' && [...guids].some(guid => item.entity.guid.startsWith(`${guid}:`)))
    ));
  }
}
