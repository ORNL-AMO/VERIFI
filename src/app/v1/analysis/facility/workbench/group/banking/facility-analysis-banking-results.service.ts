import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { calculateFacilityAnalysisGroupResults } from '@domain/calculations/analysis-calculations/facility-analysis-group-results-calculation';
import {
  FacilityAnalysisGroupResultsWorkerRequest,
  FacilityAnalysisGroupResultsWorkerResponse
} from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { runWorker } from '@platform/web-workers/run-worker';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { Observable, catchError, concat, defer, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import {
  facilityAnalysisGroupResultsFingerprint,
  projectAnalysisGroupDependencies,
  projectAnalysisGroupPredictorInputs
} from '../results/calculation/facility-analysis-group-results-request';
import {
  bankingPreviewReportYear,
  bankingSourceHasBlockingErrors
} from '../../banking/facility-analysis-banking';
import { evaluateBankedGroupConfiguration } from '@shared/shared-analysis/banking-configuration';
import { FacilityAnalysisPeriodService } from '../../analysis-setup/facility-analysis-period.service';

export type FacilityAnalysisBankingResultState =
  | { readonly state: 'idle' }
  | { readonly state: 'waiting'; readonly reason: 'configuration' | 'workspace' | 'autosave' | 'status' | 'calendarization' | 'blocked' }
  | { readonly state: 'loading'; readonly fingerprint: string }
  | {
    readonly state: 'ready'; readonly fingerprint: string; readonly sourceAnalysisGuid: string;
    readonly sourceGroup: AnalysisGroup; readonly annual: readonly AnnualAnalysisSummary[];
    readonly monthly: readonly MonthlyAnalysisSummaryData[]; readonly reportYear: number;
  }
  | { readonly state: 'error'; readonly fingerprint: string; readonly message: string };

type BankingInput =
  | { readonly key: string; readonly state: 'published'; readonly value: FacilityAnalysisBankingResultState }
  | { readonly key: string; readonly state: 'ready'; readonly fingerprint: string; readonly request: FacilityAnalysisGroupResultsWorkerRequest };

@Injectable()
export class FacilityAnalysisBankingResultsService {
  private readonly groupContext = inject(FacilityAnalysisGroupContext);
  private readonly context = this.groupContext.workbench;
  private readonly autosave = this.groupContext.autosave;
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly period = inject(FacilityAnalysisPeriodService);
  private readonly calendarizationBase = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private readonly cache = new Map<string, FacilityAnalysisBankingResultState & { readonly state: 'ready' }>();

  private readonly configuration = computed(() => evaluateBankedGroupConfiguration(
    this.autosave.draft(),
    this.groupContext.group(),
    this.context.analyses(),
    this.period.bankingLatestCompleteYears(this.groupContext.groupGuid())
  ));
  readonly sourceAnalysis = computed(() => this.configuration().source);
  readonly sourceGroup = computed(() => this.configuration().sourceGroup);
  readonly hasBlockingErrors = computed(() => {
    const current = this.autosave.draft();
    const source = this.sourceAnalysis();
    return bankingSourceHasBlockingErrors(current, source, this.context.status.items());
  });

  private readonly input = computed<BankingInput>(() => this.buildInput());
  private readonly stateStream = toObservable(this.input).pipe(
    distinctUntilChanged((first, second) => first.key === second.key),
    switchMap(input => {
      if (input.state === 'published') return of(input.value);
      const cached = this.cache.get(input.fingerprint);
      if (cached) return of(cached);
      return concat(
        of<FacilityAnalysisBankingResultState>({ state: 'loading', fingerprint: input.fingerprint }),
        this.calculate(input.request, input.fingerprint).pipe(tap(state => {
          if (state.state !== 'ready') return;
          for (const [key, value] of this.cache) {
            if (value.sourceAnalysisGuid === state.sourceAnalysisGuid
              && value.sourceGroup.idbGroupId === state.sourceGroup.idbGroupId) this.cache.delete(key);
          }
          this.cache.set(input.fingerprint, state);
        }))
      );
    })
  );

  readonly state: Signal<FacilityAnalysisBankingResultState> = toSignal(this.stateStream, {
    initialValue: { state: 'idle' }
  });

  private buildInput(): BankingInput {
    const analysis = this.autosave.draft();
    const group = this.groupContext.group();
    const source = this.sourceAnalysis();
    const sourceGroup = this.sourceGroup();
    const reportYear = bankingPreviewReportYear(group);
    if (!analysis || !group) return published({ state: 'idle' });
    if (!this.configuration().valid || !source || !sourceGroup || reportYear === undefined) {
      return published({ state: 'waiting', reason: 'configuration' });
    }
    if (!this.context.workspace.isReady()) return published({ state: 'waiting', reason: 'workspace' });
    if (!['idle', 'saved'].includes(this.autosave.state())) return published({ state: 'waiting', reason: 'autosave' });
    if (this.context.status.state() !== 'ready') return published({ state: 'waiting', reason: 'status' });
    if (this.hasBlockingErrors()) return published({ state: 'waiting', reason: 'blocked' });

    const facility = this.context.facility();
    const base = this.calendarizationBase();
    if (!facility || base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) {
      return published({ state: 'waiting', reason: 'calendarization' });
    }
    const dependencies = projectAnalysisGroupDependencies(source, sourceGroup.idbGroupId, this.context.workspace.facilityAnalyses());
    const meterGuids = this.context.workspace.facilityMeters()
      .filter(meter => meter.groupId === sourceGroup.idbGroupId)
      .map(meter => meter.guid);
    const projection = this.calendarization.project(base, {
      context: { kind: 'facility', guid: facility.guid },
      meterGuids,
      energyUnit: source.energyUnit,
      waterUnit: source.waterUnit,
      energyIsSource: source.energyIsSource,
      includeEmissions: false
    });
    if (projection.state !== 'ready') return published({ state: 'waiting', reason: 'calendarization' });
    const predictorInputs = projectAnalysisGroupPredictorInputs(
      facility.guid, dependencies, this.context.workspace.predictorData(), this.context.workspace.predictors()
    );
    const request: FacilityAnalysisGroupResultsWorkerRequest = {
      analysisItem: dependencies[0],
      groupGuid: sourceGroup.idbGroupId,
      facility: structuredClone(facility),
      calanderizedMeters: projection.meters,
      accountPredictorEntries: predictorInputs.entries,
      accountPredictors: predictorInputs.predictors,
      accountAnalysisItems: dependencies,
      reportYear
    };
    const fingerprint = facilityAnalysisGroupResultsFingerprint(request);
    return { key: `ready:${fingerprint}`, state: 'ready', fingerprint, request };
  }

  private calculate(request: FacilityAnalysisGroupResultsWorkerRequest, fingerprint: string): Observable<FacilityAnalysisBankingResultState> {
    const response$ = typeof Worker !== 'undefined'
      ? runWorker<FacilityAnalysisGroupResultsWorkerResponse>(
        new Worker(new URL('../../../../../../platform/web-workers/facility-analysis-group-results.worker', import.meta.url)),
        request
      )
      : defer(() => of<FacilityAnalysisGroupResultsWorkerResponse>({ ok: true, value: calculateFacilityAnalysisGroupResults(request) }));
    return response$.pipe(
      map(response => {
        if (response.ok === false) return { state: 'error' as const, fingerprint, message: response.message };
        const value = response.value;
        if (value.itemId !== request.analysisItem.guid || value.groupGuid !== request.groupGuid || value.reportYear !== request.reportYear) {
          return { state: 'error' as const, fingerprint, message: 'Banking calculation returned a stale result.' };
        }
        return {
          state: 'ready' as const,
          fingerprint,
          sourceAnalysisGuid: value.itemId,
          sourceGroup: value.group,
          annual: value.annualAnalysisSummaryData,
          monthly: value.monthlyAnalysisSummaryData,
          reportYear: value.reportYear!
        };
      }),
      catchError(error => of({
        state: 'error' as const,
        fingerprint,
        message: error instanceof Error ? error.message : 'Banking calculation failed.'
      }))
    );
  }
}

function published(value: FacilityAnalysisBankingResultState): BankingInput {
  const reason = value.state === 'waiting' ? value.reason : '';
  return { key: `published:${value.state}:${reason}`, state: 'published', value };
}
