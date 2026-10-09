import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { calculateFacilityAnalysisOutcomeResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import {
  FacilityAnalysisResultsWorkerRequest,
  FacilityAnalysisResultsWorkerResponse
} from '@platform/web-workers/facility-analysis-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
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
import {
  FacilityAnalysisOutcomeState,
  facilityAnalysisOutcomeSummary
} from '../facility-analysis-outcome-summary';
import {
  analysisDependencyClosure,
  facilityAnalysisResultsFingerprint,
  projectFacilityPredictorInputs
} from '../facility-analysis-workbench/results/calculation/facility-analysis-results-request';

interface DashboardResultRequest {
  readonly analysisGuid: string;
  readonly fingerprint: string;
  readonly request: FacilityAnalysisResultsWorkerRequest;
}

interface DashboardResultInput {
  readonly key: string;
  readonly states: Readonly<Record<string, FacilityAnalysisOutcomeState>>;
  readonly requests: readonly DashboardResultRequest[];
}

interface DashboardResultUpdate {
  readonly analysisGuid: string;
  readonly state: FacilityAnalysisOutcomeState;
}

interface CachedDashboardResult {
  readonly fingerprint: string;
  readonly state: FacilityAnalysisOutcomeState & { readonly state: 'ready' };
}

@Injectable()
export class FacilityAnalysisDashboardResultsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
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

  readonly states: Signal<Readonly<Record<string, FacilityAnalysisOutcomeState>>> = toSignal(
    this.stateStream,
    { initialValue: {} }
  );

  private buildInput(): DashboardResultInput {
    const analyses = [...this.workspace.selectedFacilityAnalyses()]
      .sort((first, second) => first.guid.localeCompare(second.guid));
    const facility = this.workspace.selectedFacility();
    const stateEntries: Array<readonly [string, FacilityAnalysisOutcomeState]> = [];
    const requests: DashboardResultRequest[] = [];
    const keyParts: string[] = [];
    const scopeKey = analyses.map(analysis => analysis.guid).join(',');

    if (!facility || !this.workspace.isReady()) {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'loading', message: 'Preparing data…' }]));
      return dashboardInput(stateEntries, requests, `workspace:${this.workspace.status()}:${facility?.guid ?? ''}:${scopeKey}`);
    }
    if (this.status.state() === 'error') {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'error', message: 'Validation failed' }]));
      return dashboardInput(stateEntries, requests, `status:error:${facility.guid}:${scopeKey}`);
    }
    if (this.status.state() !== 'ready') {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'loading', message: 'Checking readiness…' }]));
      return dashboardInput(stateEntries, requests, `status:${this.status.state()}:${facility.guid}:${scopeKey}`);
    }

    const base = this.calendarizationBase();
    if (base.state === 'error') {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'error', message: 'Calculation data unavailable' }]));
      return dashboardInput(stateEntries, requests, `calendarization:error:${facility.guid}:${scopeKey}`);
    }
    const currentCalendarizationFingerprint = this.calendarization.currentInputFingerprint();
    if (base.state !== 'ready' || base.inputFingerprint !== currentCalendarizationFingerprint) {
      analyses.forEach(analysis => stateEntries.push([analysis.guid, { state: 'loading', message: 'Preparing data…' }]));
      return dashboardInput(
        stateEntries,
        requests,
        `calendarization:${base.state}:${base.inputFingerprint ?? ''}:${currentCalendarizationFingerprint}:${facility.guid}:${scopeKey}`
      );
    }

    analyses.forEach(analysis => {
      if (this.hasBlockingErrors(analysis.guid)) {
        stateEntries.push([analysis.guid, { state: 'blocked', message: 'Setup incomplete' }]);
        keyParts.push(`${analysis.guid}:blocked`);
        return;
      }
      const request = this.buildRequest(analysis, facility.guid, base);
      if (!request) {
        stateEntries.push([analysis.guid, { state: 'error', message: 'Calculation data unavailable' }]);
        keyParts.push(`${analysis.guid}:projection-error`);
        return;
      }
      const fingerprint = facilityAnalysisResultsFingerprint(request);
      const cached = this.cache.get(analysis.guid);
      if (cached?.fingerprint === fingerprint) {
        stateEntries.push([analysis.guid, cached.state]);
        keyParts.push(`${analysis.guid}:${fingerprint}`);
        return;
      }
      stateEntries.push([analysis.guid, { state: 'loading', message: 'Calculating…' }]);
      requests.push({ analysisGuid: analysis.guid, fingerprint, request });
      keyParts.push(`${analysis.guid}:${fingerprint}`);
    });

    return {
      key: keyParts.join('|'),
      states: Object.fromEntries(stateEntries),
      requests
    };
  }

  private buildRequest(
    analysis: IdbAnalysisItem,
    facilityGuid: string,
    base: ReturnType<FacilityAnalysisDashboardResultsService['calendarizationBase']>
  ): FacilityAnalysisResultsWorkerRequest | undefined {
    const facility = this.workspace.selectedFacility();
    if (!facility || base.state !== 'ready') return undefined;
    const dependencies = analysisDependencyClosure(analysis, this.workspace.facilityAnalyses());
    const groupIds = new Set(dependencies.flatMap(item => item.groups.map(group => group.idbGroupId)));
    const meterGuids = this.workspace.facilityMeters()
      .filter(meter => groupIds.has(meter.groupId))
      .map(meter => meter.guid);
    const projection = this.calendarization.project(base, {
      context: { kind: 'facility', guid: facilityGuid },
      meterGuids,
      energyUnit: analysis.energyUnit,
      waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource,
      includeEmissions: false
    });
    if (projection.state !== 'ready') return undefined;
    const predictorInputs = projectFacilityPredictorInputs(
      facilityGuid,
      this.workspace.predictorData(),
      this.workspace.predictors()
    );
    return {
      analysisItem: structuredClone(analysis),
      facility: structuredClone(facility),
      calanderizedMeters: projection.meters,
      accountPredictorEntries: predictorInputs.entries,
      accountPredictors: predictorInputs.predictors,
      accountAnalysisItems: dependencies,
      calculateAllMonthlyData: true,
      includeGroupSummaries: false
    };
  }

  private calculate(input: DashboardResultRequest): Observable<DashboardResultUpdate> {
    const response$ = defer(() => typeof Worker !== 'undefined'
      ? runWorker<FacilityAnalysisResultsWorkerResponse>(
          new Worker(new URL('../../../../platform/web-workers/facility-analysis-dashboard-results.worker', import.meta.url)),
          input.request
        )
      : of<FacilityAnalysisResultsWorkerResponse>({
          ok: true,
          value: calculateFacilityAnalysisOutcomeResults(input.request)
        }));
    return response$.pipe(
      timeout(CALCULATION_WORKER_TIMEOUT_MS),
      map(response => ({
        analysisGuid: input.analysisGuid,
        state: dashboardOutcomeState(response, input)
      })),
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
    return this.status.items().some(item => item.severity === 'error' && (
      (item.entity.kind === 'facility-analysis' && item.entity.guid === analysisGuid)
      || (item.entity.kind === 'analysis-group' && item.entity.guid.startsWith(`${analysisGuid}:`))
    ));
  }
}

function dashboardOutcomeState(
  response: FacilityAnalysisResultsWorkerResponse,
  input: DashboardResultRequest
): FacilityAnalysisOutcomeState {
  if (response.ok === false || response.value.itemId !== input.analysisGuid) {
    return { state: 'error', message: 'Calculation failed' };
  }
  return {
    state: 'ready',
    summary: facilityAnalysisOutcomeSummary(
      response.value.annualAnalysisSummaries,
      response.value.monthlyAnalysisSummaryData,
      response.value.reportYear,
      input.request.facility
    )
  };
}

function dashboardInput(
  entries: Array<readonly [string, FacilityAnalysisOutcomeState]>,
  requests: readonly DashboardResultRequest[],
  key: string
): DashboardResultInput {
  return { key, states: Object.fromEntries(entries), requests };
}
