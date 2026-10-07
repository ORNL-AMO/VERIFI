import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import {
  FacilityAnalysisResultsWorkerRequest,
  FacilityAnalysisResultsWorkerResponse,
  FacilityAnalysisResultsValue
} from '@platform/web-workers/facility-analysis-results-worker.contract';
import { runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { Observable, catchError, concat, defer, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { FacilityAnalysisWorkbenchContext } from '../../facility-analysis-workbench-context.service';
import { FacilityAnalysisAutosaveService } from '../../editing/facility-analysis-autosave.service';
import { analysisDependencyClosure, facilityAnalysisResultsFingerprint, projectFacilityPredictorInputs } from './facility-analysis-results-request';

export interface FacilityAnalysisGroupResult {
  readonly group: AnalysisGroup;
  readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
  readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[];
}

export type FacilityAnalysisWaitingReason = 'workspace' | 'autosave' | 'status' | 'blocked' | 'calendarization';

export type FacilityAnalysisResultState =
  | { readonly state: 'idle'; readonly analysisGuid?: string }
  | { readonly state: 'waiting'; readonly analysisGuid: string; readonly reason: FacilityAnalysisWaitingReason }
  | { readonly state: 'loading'; readonly analysisGuid: string; readonly fingerprint: string }
  | {
    readonly state: 'ready'; readonly analysisGuid: string; readonly fingerprint: string;
    readonly annual: readonly AnnualAnalysisSummary[];
    readonly monthly: readonly MonthlyAnalysisSummaryData[];
    readonly groups: readonly FacilityAnalysisGroupResult[];
    readonly reportYear?: number;
  }
  | { readonly state: 'error'; readonly analysisGuid: string; readonly fingerprint: string; readonly message: string };

type ResultInput =
  | { readonly key: string; readonly state: 'idle'; readonly analysisGuid?: string }
  | { readonly key: string; readonly state: 'waiting'; readonly analysisGuid: string; readonly reason: FacilityAnalysisWaitingReason }
  | {
    readonly key: string;
    readonly state: 'ready';
    readonly analysisGuid: string;
    readonly fingerprint: string;
    readonly request: FacilityAnalysisResultsWorkerRequest;
  };

@Injectable()
export class FacilityAnalysisResultsService {
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly autosave = inject(FacilityAnalysisAutosaveService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private readonly cache = new Map<string, FacilityAnalysisResultState & { readonly state: 'ready' }>();
  private readonly input = computed<ResultInput>(() => this.buildInput());
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (input.state === 'idle') return of<FacilityAnalysisResultState>({ state: 'idle', analysisGuid: input.analysisGuid });
      if (input.state === 'waiting') {
        return of<FacilityAnalysisResultState>({ state: 'waiting', analysisGuid: input.analysisGuid, reason: input.reason });
      }
      const cached = this.cache.get(input.fingerprint);
      if (cached) return of(cached);
      return concat(
        of<FacilityAnalysisResultState>({ state: 'loading', analysisGuid: input.analysisGuid, fingerprint: input.fingerprint }),
        this.calculate(input.request, input.fingerprint).pipe(tap(state => {
          if (state.state !== 'ready') return;
          for (const [key, value] of this.cache) {
            if (value.analysisGuid === state.analysisGuid) this.cache.delete(key);
          }
          this.cache.set(input.fingerprint, state);
        }))
      );
    })
  );

  readonly state: Signal<FacilityAnalysisResultState> = toSignal(this.stateStream, { initialValue: { state: 'idle' } });

  private buildInput(): ResultInput {
    const analysis = this.context.analysis();
    if (!analysis) return { key: 'idle', state: 'idle' };
    const analysisGuid = analysis.guid;
    if (!this.context.workspace.isReady()) return waiting(analysisGuid, 'workspace');
    if (!['idle', 'saved'].includes(this.autosave.state())) return waiting(analysisGuid, 'autosave');
    if (this.context.status.state() !== 'ready') return waiting(analysisGuid, 'status');
    if (this.context.hasBlockingErrors()) return waiting(analysisGuid, 'blocked');

    const facility = this.context.facility();
    const base = this.calendarizationBase();
    if (!facility || base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) {
      return waiting(analysisGuid, 'calendarization');
    }
    const dependencies = analysisDependencyClosure(analysis, this.context.workspace.facilityAnalyses());
    const groupIds = new Set(dependencies.flatMap(item => item.groups.map(group => group.idbGroupId)));
    const meterGuids = this.context.workspace.facilityMeters()
      .filter(meter => groupIds.has(meter.groupId))
      .map(meter => meter.guid);
    const projection = this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid },
      meterGuids,
      energyUnit: analysis.energyUnit,
      waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource,
      includeEmissions: false
    });
    if (projection.state !== 'ready') return waiting(analysisGuid, 'calendarization');
    const predictorInputs = projectFacilityPredictorInputs(
      facility.guid,
      this.context.workspace.predictorData(),
      this.context.workspace.predictors()
    );

    const request: FacilityAnalysisResultsWorkerRequest = {
      analysisItem: structuredClone(analysis),
      facility: structuredClone(facility),
      calanderizedMeters: projection.meters,
      accountPredictorEntries: predictorInputs.entries,
      accountPredictors: predictorInputs.predictors,
      accountAnalysisItems: dependencies,
      calculateAllMonthlyData: false,
      includeGroupSummaries: true
    };
    const fingerprint = facilityAnalysisResultsFingerprint(request);
    return { key: `ready:${fingerprint}`, state: 'ready', analysisGuid, fingerprint, request };
  }

  private calculate(
    request: FacilityAnalysisResultsWorkerRequest,
    fingerprint: string
  ): Observable<FacilityAnalysisResultState> {
    const response$ = typeof Worker !== 'undefined'
      ? runWorker<FacilityAnalysisResultsWorkerResponse>(
        new Worker(new URL('../../../../../../platform/web-workers/facility-analysis-results.worker', import.meta.url)),
        request
      )
      : defer(() => of<FacilityAnalysisResultsWorkerResponse>({
        ok: true,
        value: calculateFacilityAnalysisResults(request)
      }));
    return response$.pipe(
      map(response => normalizeFacilityAnalysisWorkerResponse(response, request.analysisItem.guid, fingerprint)),
      catchError(error => of({
        state: 'error' as const,
        analysisGuid: request.analysisItem.guid,
        fingerprint,
        message: error instanceof Error ? error.message : 'Facility analysis calculation failed.'
      }))
    );
  }
}

export function normalizeFacilityAnalysisWorkerResponse(
  response: FacilityAnalysisResultsWorkerResponse,
  analysisGuid: string,
  fingerprint: string
): FacilityAnalysisResultState {
  if (response.ok === false) return { state: 'error', analysisGuid, fingerprint, message: response.message };
  return normalizeFacilityAnalysisValue(response.value, analysisGuid, fingerprint);
}

function normalizeFacilityAnalysisValue(
  value: FacilityAnalysisResultsValue,
  analysisGuid: string,
  fingerprint: string
): FacilityAnalysisResultState {
  if (value.itemId !== analysisGuid) {
    return { state: 'error', analysisGuid, fingerprint, message: 'Facility analysis calculation returned a stale result.' };
  }
  return {
    state: 'ready',
    analysisGuid,
    fingerprint,
    annual: value.annualAnalysisSummaries,
    monthly: value.monthlyAnalysisSummaryData,
    groups: value.groupSummaries,
    reportYear: value.reportYear
  };
}

function waiting(analysisGuid: string, reason: FacilityAnalysisWaitingReason): ResultInput {
  return { key: `waiting:${analysisGuid}:${reason}`, state: 'waiting', analysisGuid, reason };
}
