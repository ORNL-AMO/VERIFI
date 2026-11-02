import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { calculateFacilityAnalysisGroupResults } from '@domain/calculations/analysis-calculations/facility-analysis-group-results-calculation';
import {
  FacilityAnalysisGroupResultsWorkerRequest,
  FacilityAnalysisGroupResultsWorkerResponse,
  FacilityAnalysisGroupResultsValue
} from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { Observable, catchError, concat, defer, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import {
  FacilityAnalysisResultState,
  FacilityAnalysisResultsService,
  FacilityAnalysisWaitingReason
} from '../../../results/calculation/facility-analysis-results.service';
import {
  facilityAnalysisGroupResultsFingerprint,
  projectAnalysisGroupDependencies,
  projectAnalysisGroupPredictorInputs
} from './facility-analysis-group-results-request';

export type FacilityAnalysisGroupResultState =
  | { readonly state: 'idle'; readonly analysisGuid?: string; readonly groupGuid?: string }
  | { readonly state: 'waiting'; readonly analysisGuid: string; readonly groupGuid: string; readonly reason: FacilityAnalysisWaitingReason }
  | { readonly state: 'loading'; readonly analysisGuid: string; readonly groupGuid: string; readonly fingerprint: string }
  | {
    readonly state: 'ready'; readonly analysisGuid: string; readonly groupGuid: string; readonly fingerprint: string;
    readonly group: AnalysisGroup;
    readonly annual: readonly AnnualAnalysisSummary[];
    readonly monthly: readonly MonthlyAnalysisSummaryData[];
    readonly reportYear?: number;
  }
  | { readonly state: 'error'; readonly analysisGuid: string; readonly groupGuid: string; readonly fingerprint: string; readonly message: string };

type ResultInput =
  | { readonly key: string; readonly state: 'published'; readonly value: FacilityAnalysisGroupResultState }
  | {
    readonly key: string; readonly state: 'ready'; readonly analysisGuid: string; readonly groupGuid: string;
    readonly fingerprint: string; readonly request: FacilityAnalysisGroupResultsWorkerRequest;
  };

@Injectable()
export class FacilityAnalysisGroupResultsService {
  private readonly groupContext = inject(FacilityAnalysisGroupContext);
  private readonly context = this.groupContext.workbench;
  private readonly autosave = this.groupContext.autosave;
  private readonly facilityResults = inject(FacilityAnalysisResultsService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private readonly cache = new Map<string, FacilityAnalysisGroupResultState & { readonly state: 'ready' }>();

  readonly hasBlockingErrors = computed(() => {
    const analysisGuid = this.context.analysisGuid();
    const groupGuid = this.groupContext.groupGuid();
    return this.context.findings().some(item => item.severity === 'error' && (
      (item.entity.kind === 'facility-analysis' && item.entity.guid === analysisGuid)
      || (item.entity.kind === 'analysis-group' && item.entity.guid === `${analysisGuid}:${groupGuid}`)
    ));
  });

  private readonly input = computed<ResultInput>(() => this.buildInput());
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (input.state === 'published') return of(input.value);
      const cached = this.cache.get(input.fingerprint);
      if (cached) return of(cached);
      return concat(
        of<FacilityAnalysisGroupResultState>({
          state: 'loading', analysisGuid: input.analysisGuid, groupGuid: input.groupGuid, fingerprint: input.fingerprint
        }),
        this.calculate(input.request, input.fingerprint).pipe(tap(state => {
          if (state.state !== 'ready') return;
          for (const [key, value] of this.cache) {
            if (value.analysisGuid === state.analysisGuid && value.groupGuid === state.groupGuid) this.cache.delete(key);
          }
          this.cache.set(input.fingerprint, state);
        }))
      );
    })
  );

  readonly state: Signal<FacilityAnalysisGroupResultState> = toSignal(this.stateStream, {
    initialValue: { state: 'idle' }
  });

  private buildInput(): ResultInput {
    const analysis = this.context.analysis();
    const groupGuid = this.groupContext.groupGuid();
    const group = analysis?.groups.find(item => item.idbGroupId === groupGuid);
    if (!analysis || !group) return published({ state: 'idle', analysisGuid: analysis?.guid, groupGuid });
    const analysisGuid = analysis.guid;
    if (!this.context.workspace.isReady()) return published(waiting(analysisGuid, groupGuid, 'workspace'));
    if (!['idle', 'saved'].includes(this.autosave.state())) return published(waiting(analysisGuid, groupGuid, 'autosave'));
    if (this.context.status.state() !== 'ready') return published(waiting(analysisGuid, groupGuid, 'status'));
    if (this.hasBlockingErrors()) return published(waiting(analysisGuid, groupGuid, 'blocked'));

    if (!this.context.hasBlockingErrors()) {
      return published(projectFacilityState(this.facilityResults.state(), groupGuid));
    }

    const facility = this.context.facility();
    const base = this.calendarizationBase();
    if (!facility || base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) {
      return published(waiting(analysisGuid, groupGuid, 'calendarization'));
    }
    const dependencies = projectAnalysisGroupDependencies(
      analysis,
      groupGuid,
      this.context.workspace.facilityAnalyses()
    );
    const meterGuids = this.context.workspace.facilityMeters()
      .filter(meter => meter.groupId === groupGuid)
      .map(meter => meter.guid);
    const projection = this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid },
      meterGuids,
      energyUnit: analysis.energyUnit,
      waterUnit: analysis.waterUnit,
      energyIsSource: analysis.energyIsSource,
      includeEmissions: false
    });
    if (projection.state !== 'ready') return published(waiting(analysisGuid, groupGuid, 'calendarization'));
    const predictorInputs = projectAnalysisGroupPredictorInputs(
      facility.guid,
      dependencies,
      this.context.workspace.predictorData(),
      this.context.workspace.predictors()
    );
    const request: FacilityAnalysisGroupResultsWorkerRequest = {
      analysisItem: dependencies[0],
      groupGuid,
      facility: structuredClone(facility),
      calanderizedMeters: projection.meters,
      accountPredictorEntries: predictorInputs.entries,
      accountPredictors: predictorInputs.predictors,
      accountAnalysisItems: dependencies
    };
    const fingerprint = facilityAnalysisGroupResultsFingerprint(request);
    return { key: `ready:${fingerprint}`, state: 'ready', analysisGuid, groupGuid, fingerprint, request };
  }

  private calculate(
    request: FacilityAnalysisGroupResultsWorkerRequest,
    fingerprint: string
  ): Observable<FacilityAnalysisGroupResultState> {
    const response$ = typeof Worker !== 'undefined'
      ? runWorker<FacilityAnalysisGroupResultsWorkerResponse>(
        new Worker(new URL('../../../../../../../platform/web-workers/facility-analysis-group-results.worker', import.meta.url)),
        request
      )
      : defer(() => of<FacilityAnalysisGroupResultsWorkerResponse>({
        ok: true,
        value: calculateFacilityAnalysisGroupResults(request)
      }));
    return response$.pipe(
      map(response => normalizeFacilityAnalysisGroupWorkerResponse(
        response,
        request.analysisItem.guid,
        request.groupGuid,
        fingerprint
      )),
      catchError(error => of({
        state: 'error' as const,
        analysisGuid: request.analysisItem.guid,
        groupGuid: request.groupGuid,
        fingerprint,
        message: error instanceof Error ? error.message : 'Analysis group calculation failed.'
      }))
    );
  }
}

export function normalizeFacilityAnalysisGroupWorkerResponse(
  response: FacilityAnalysisGroupResultsWorkerResponse,
  analysisGuid: string,
  groupGuid: string,
  fingerprint: string
): FacilityAnalysisGroupResultState {
  if (response.ok === false) return { state: 'error', analysisGuid, groupGuid, fingerprint, message: response.message };
  return normalizeFacilityAnalysisGroupValue(response.value, analysisGuid, groupGuid, fingerprint);
}

function normalizeFacilityAnalysisGroupValue(
  value: FacilityAnalysisGroupResultsValue,
  analysisGuid: string,
  groupGuid: string,
  fingerprint: string
): FacilityAnalysisGroupResultState {
  if (value.itemId !== analysisGuid || value.groupGuid !== groupGuid) {
    return { state: 'error', analysisGuid, groupGuid, fingerprint, message: 'Analysis group calculation returned a stale result.' };
  }
  return {
    state: 'ready',
    analysisGuid,
    groupGuid,
    fingerprint,
    group: value.group,
    annual: value.annualAnalysisSummaryData,
    monthly: value.monthlyAnalysisSummaryData,
    reportYear: value.reportYear
  };
}

function projectFacilityState(
  state: FacilityAnalysisResultState,
  groupGuid: string
): FacilityAnalysisGroupResultState {
  const analysisGuid = state.analysisGuid;
  if (!analysisGuid) return { state: 'idle', groupGuid };
  if (state.state === 'idle') return { state: 'idle', analysisGuid, groupGuid };
  if (state.state === 'waiting') return waiting(analysisGuid, groupGuid, state.reason);
  if (state.state === 'loading') {
    return { state: 'loading', analysisGuid, groupGuid, fingerprint: `${state.fingerprint}:${groupGuid}` };
  }
  if (state.state === 'error') {
    return { state: 'error', analysisGuid, groupGuid, fingerprint: `${state.fingerprint}:${groupGuid}`, message: state.message };
  }
  const result = state.groups.find(item => item.group.idbGroupId === groupGuid);
  if (!result) {
    return {
      state: 'error', analysisGuid, groupGuid, fingerprint: `${state.fingerprint}:${groupGuid}`,
      message: 'The facility calculation did not return the selected analysis group.'
    };
  }
  return {
    state: 'ready', analysisGuid, groupGuid, fingerprint: `${state.fingerprint}:${groupGuid}`,
    group: result.group, annual: result.annualAnalysisSummaryData, monthly: result.monthlyAnalysisSummaryData,
    reportYear: state.reportYear
  };
}

function waiting(
  analysisGuid: string,
  groupGuid: string,
  reason: FacilityAnalysisWaitingReason
): FacilityAnalysisGroupResultState & { readonly state: 'waiting' } {
  return { state: 'waiting', analysisGuid, groupGuid, reason };
}

function published(value: FacilityAnalysisGroupResultState): ResultInput {
  const fingerprint = 'fingerprint' in value ? value.fingerprint : '';
  const reason = value.state === 'waiting' ? value.reason : '';
  return {
    key: `published:${value.state}:${value.analysisGuid ?? ''}:${value.groupGuid ?? ''}:${fingerprint}:${reason}`,
    state: 'published',
    value
  };
}
