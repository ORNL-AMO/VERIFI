import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { calculateFacilityAnalysisOutcomeResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import {
  FacilityAnalysisResultsWorkerRequest,
  FacilityAnalysisResultsWorkerResponse
} from '@platform/web-workers/facility-analysis-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import {
  FacilityAnalysisOutcomeState,
  facilityAnalysisOutcomeSummary
} from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import {
  Observable,
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
  timeout
} from 'rxjs';
import {
  analysisDependencyClosure,
  facilityAnalysisResultsFingerprint,
  projectFacilityPredictorInputs
} from '../../facility-analysis-workbench/results/calculation/facility-analysis-results-request';
export type FacilityAnalysisDetailsResultState =
  | { readonly state: 'idle' }
  | ({ readonly analysisGuid: string } & FacilityAnalysisOutcomeState);

type DetailsResultInput =
  | { readonly key: string; readonly state: 'idle' }
  | {
      readonly key: string;
      readonly state: 'display';
      readonly value: FacilityAnalysisDetailsResultState;
    }
  | {
      readonly key: string;
      readonly state: 'calculate';
      readonly analysisGuid: string;
      readonly fingerprint: string;
      readonly request: FacilityAnalysisResultsWorkerRequest;
    };

@Injectable()
export class FacilityAnalysisDetailsResultsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly targetGuidValue = signal<string | undefined>(undefined);
  private readonly cache = new Map<string, Extract<FacilityAnalysisDetailsResultState, { readonly state: 'ready' }>>();
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private readonly input = computed<DetailsResultInput>(() => this.buildInput());
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (input.state === 'idle') return of<FacilityAnalysisDetailsResultState>({ state: 'idle' });
      if (input.state === 'display') return of(input.value);
      const cached = this.cache.get(input.fingerprint);
      if (cached) return of(cached);
      return concat(
        of<FacilityAnalysisDetailsResultState>({
          state: 'loading', analysisGuid: input.analysisGuid, message: 'Calculating…'
        }),
        this.calculate(input).pipe(tap(state => {
          if (state.state !== 'ready') return;
          for (const [fingerprint, cached] of this.cache) {
            if (cached.analysisGuid === state.analysisGuid) this.cache.delete(fingerprint);
          }
          this.cache.set(input.fingerprint, state);
        }))
      );
    })
  );

  readonly state: Signal<FacilityAnalysisDetailsResultState> = toSignal(
    this.stateStream,
    { initialValue: { state: 'idle' } }
  );

  open(analysisGuid: string): void {
    this.targetGuidValue.set(analysisGuid);
  }

  close(): void {
    this.targetGuidValue.set(undefined);
  }

  private buildInput(): DetailsResultInput {
    const analysisGuid = this.targetGuidValue();
    if (!analysisGuid) return { key: 'idle', state: 'idle' };
    const analysis = this.workspace.facilityAnalyses().find(item => item.guid === analysisGuid);
    const facility = analysis
      ? this.workspace.facilities().find(item => item.guid === analysis.facilityId)
      : undefined;
    if (!analysis || !facility) return display(analysisGuid, 'error', 'Analysis data is unavailable.');
    if (!this.workspace.isReady()) return display(analysisGuid, 'loading', 'Preparing data…');
    if (this.status.state() === 'error') return display(analysisGuid, 'error', 'Validation failed');
    if (this.status.state() !== 'ready') return display(analysisGuid, 'loading', 'Checking readiness…');
    if (this.hasBlockingErrors(analysisGuid)) return display(analysisGuid, 'blocked', 'Setup incomplete');

    const base = this.calendarizationBase();
    if (base.state === 'error') return display(analysisGuid, 'error', 'Calculation data unavailable');
    if (base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) {
      return display(analysisGuid, 'loading', 'Preparing data…');
    }

    const dependencies = analysisDependencyClosure(analysis, this.workspace.facilityAnalyses());
    const groupIds = new Set(dependencies.flatMap(item => item.groups.map(group => group.idbGroupId)));
    const meterGuids = this.workspace.meters()
      .filter(meter => meter.facilityId === facility.guid && groupIds.has(meter.groupId))
      .map(meter => meter.guid);
    const projection = this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid },
      meterGuids,
      energyUnit: analysis.energyUnit,
      waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource,
      includeEmissions: false
    });
    if (projection.state !== 'ready') return display(analysisGuid, 'error', 'Calculation data unavailable');
    const predictorInputs = projectFacilityPredictorInputs(
      facility.guid,
      this.workspace.predictorData(),
      this.workspace.predictors()
    );
    const request: FacilityAnalysisResultsWorkerRequest = {
      analysisItem: structuredClone(analysis),
      facility: structuredClone(facility),
      calanderizedMeters: projection.meters,
      accountPredictorEntries: predictorInputs.entries,
      accountPredictors: predictorInputs.predictors,
      accountAnalysisItems: dependencies,
      calculateAllMonthlyData: true,
      includeGroupSummaries: false
    };
    const fingerprint = facilityAnalysisResultsFingerprint(request);
    return {
      key: `calculate:${fingerprint}`,
      state: 'calculate',
      analysisGuid,
      fingerprint,
      request
    };
  }

  private calculate(
    input: Extract<DetailsResultInput, { readonly state: 'calculate' }>
  ): Observable<FacilityAnalysisDetailsResultState> {
    const response$ = defer(() => typeof Worker !== 'undefined'
      ? runWorker<FacilityAnalysisResultsWorkerResponse>(
          new Worker(new URL('../../../../../platform/web-workers/facility-analysis-dashboard-results.worker', import.meta.url)),
          input.request
        )
      : of<FacilityAnalysisResultsWorkerResponse>({
          ok: true,
          value: calculateFacilityAnalysisOutcomeResults(input.request)
        }));
    return response$.pipe(
      timeout(CALCULATION_WORKER_TIMEOUT_MS),
      map(response => normalizeDetailsResult(response, input)),
      catchError(() => of<FacilityAnalysisDetailsResultState>({
        state: 'error', analysisGuid: input.analysisGuid, message: 'Calculation failed'
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

function display(
  analysisGuid: string,
  state: 'loading' | 'blocked' | 'error',
  message: string
): DetailsResultInput {
  return {
    key: `display:${analysisGuid}:${state}:${message}`,
    state: 'display',
    value: { state, analysisGuid, message }
  };
}

function normalizeDetailsResult(
  response: FacilityAnalysisResultsWorkerResponse,
  input: Extract<DetailsResultInput, { readonly state: 'calculate' }>
): FacilityAnalysisDetailsResultState {
  if (response.ok === false || response.value.itemId !== input.analysisGuid) {
    return { state: 'error', analysisGuid: input.analysisGuid, message: 'Calculation failed' };
  }
  return {
    state: 'ready',
    analysisGuid: input.analysisGuid,
    summary: facilityAnalysisOutcomeSummary(
      response.value.annualAnalysisSummaries,
      response.value.monthlyAnalysisSummaryData,
      response.value.reportYear,
      input.request.facility
    )
  };
}
