import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnnualFacilityAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { runWorker } from '@platform/web-workers/run-worker';
import { Observable, catchError, concat, defer, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';

export interface FacilityAnalysisGroupResult {
  readonly group: AnalysisGroup;
  readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
  readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[];
}

export type FacilityAnalysisResultState =
  | { readonly state: 'idle'; readonly analysisGuid?: string; readonly revision?: number }
  | { readonly state: 'loading'; readonly analysisGuid: string; readonly revision: number }
  | {
    readonly state: 'ready'; readonly analysisGuid: string; readonly revision: number;
    readonly annual: readonly AnnualAnalysisSummary[];
    readonly monthly: readonly MonthlyAnalysisSummaryData[];
    readonly groups: readonly FacilityAnalysisGroupResult[];
    readonly reportYear?: number;
  }
  | { readonly state: 'error'; readonly analysisGuid: string; readonly revision: number; readonly message: string };

interface ResultInput {
  readonly key: string;
  readonly revision: number;
  readonly analysis?: IdbAnalysisItem;
  readonly ready: boolean;
}

interface WorkerResponse {
  readonly annualAnalysisSummaries?: AnnualAnalysisSummary[];
  readonly monthlyAnalysisSummaryData?: MonthlyAnalysisSummaryData[];
  readonly groupSummaries?: FacilityAnalysisGroupResult[];
  readonly reportYear?: number;
  readonly itemId?: string;
  readonly error?: boolean;
}

@Injectable()
export class FacilityAnalysisResultsService {
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly input = computed<ResultInput>(() => {
    const analysis = this.context.analysis();
    const revision = this.context.workspace.revision();
    const ready = !!analysis && !!this.context.facility() && !!this.context.account()
      && this.context.workspace.isReady() && !this.context.hasBlockingErrors();
    return {
      key: `${analysis?.guid ?? ''}:${revision}:${ready}`,
      revision,
      analysis,
      ready
    };
  });
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (!input.ready || !input.analysis) {
        return of<FacilityAnalysisResultState>({ state: 'idle', analysisGuid: input.analysis?.guid, revision: input.revision });
      }
      return concat(
        of<FacilityAnalysisResultState>({ state: 'loading', analysisGuid: input.analysis.guid, revision: input.revision }),
        this.calculate(input.analysis, input.revision)
      );
    })
  );

  readonly state: Signal<FacilityAnalysisResultState> = toSignal(this.stateStream, { initialValue: { state: 'idle' } });
  readonly selectedGroup = (groupGuid: string): FacilityAnalysisGroupResult | undefined => {
    const state = this.state();
    return state.state === 'ready' ? state.groups.find(item => item.group.idbGroupId === groupGuid) : undefined;
  };

  private calculate(analysis: IdbAnalysisItem, revision: number): Observable<FacilityAnalysisResultState> {
    const facility = this.context.facility()!;
    const account = this.context.account()!;
    const payload = {
      analysisItem: structuredClone(analysis),
      facility,
      meters: [...this.context.workspace.facilityMeters()],
      meterData: [...this.context.workspace.facilityMeterData()],
      accountPredictorEntries: [...this.context.workspace.predictorData()],
      calculateAllMonthlyData: false,
      accountPredictors: [...this.context.workspace.predictors()],
      accountAnalysisItems: [...this.context.workspace.facilityAnalyses()],
      includeGroupSummaries: true,
      assessmentReportVersion: account.assessmentReportVersion,
      customGWPs: [...this.context.workspace.customGWPs()]
    };
    const response$ = typeof Worker !== 'undefined'
      ? runWorker<WorkerResponse>(
        new Worker(new URL('../../../../platform/web-workers/annual-facility-analysis.worker', import.meta.url)),
        payload
      )
      : defer(() => of(calculateFacilityAnalysisSynchronously(payload)));
    return response$.pipe(
      map(response => normalizeFacilityAnalysisWorkerResponse(response, analysis.guid, revision)),
      catchError(error => of({
        state: 'error' as const,
        analysisGuid: analysis.guid,
        revision,
        message: error instanceof Error ? error.message : 'Facility analysis calculation failed.'
      }))
    );
  }
}

export function normalizeFacilityAnalysisWorkerResponse(
  response: WorkerResponse,
  analysisGuid: string,
  revision: number
): FacilityAnalysisResultState {
  if (response.error || (response.itemId && response.itemId !== analysisGuid)
    || !response.annualAnalysisSummaries || !response.monthlyAnalysisSummaryData || !response.groupSummaries) {
    return { state: 'error', analysisGuid, revision, message: 'Facility analysis calculation failed.' };
  }
  return {
    state: 'ready',
    analysisGuid,
    revision,
    annual: response.annualAnalysisSummaries,
    monthly: response.monthlyAnalysisSummaryData,
    groups: response.groupSummaries,
    reportYear: response.reportYear
  };
}

function calculateFacilityAnalysisSynchronously(payload: any): WorkerResponse {
  const calanderizedMeters = getCalanderizedMeterData(
    payload.meters, payload.meterData, payload.facility, false,
    { energyIsSource: payload.analysisItem.energyIsSource, neededUnits: getNeededUnits(payload.analysisItem) },
    [], [], [payload.facility], payload.assessmentReportVersion, payload.customGWPs
  );
  const calculation = new AnnualFacilityAnalysisSummaryClass(
    payload.analysisItem, payload.facility, calanderizedMeters, payload.accountPredictorEntries,
    payload.calculateAllMonthlyData, payload.accountPredictors, payload.accountAnalysisItems,
    payload.includeGroupSummaries
  );
  return {
    annualAnalysisSummaries: calculation.getAnnualAnalysisSummaries(),
    monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData,
    groupSummaries: calculation.groupSummaries,
    reportYear: calculation.reportYear,
    itemId: payload.analysisItem.guid,
    error: false
  };
}
