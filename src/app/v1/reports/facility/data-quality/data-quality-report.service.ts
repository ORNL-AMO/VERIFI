import { Injectable, Injector, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { buildDataQualityAnnualTotals, dataQualityAnnualEmissionsMultiplier, DataQualityAnnualTotals } from '@domain/reports/data-quality-report-annual-totals';
import { CalanderizedMeter } from '@data/models/calanderization';
import { asyncScheduler, map, of, scheduled, switchMap, toArray } from 'rxjs';
import { buildDataQualityMeterInputs, buildDataQualityPredictorInputs, DataQualityMeterInput, DataQualityPredictorInput } from '@domain/reports/data-quality-report-inputs';
import { buildMeterDataQualityReport, MeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { buildPredictorDataQualityReport, PredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { ReportResultController, ReportResultRequest } from '@app/v1/reports/shared/calculation/report-result-controller';
import { DataQualityReportEditor } from './editing/data-quality-report-editor.service';
import { buildDataQualityReportSnapshot } from './data-quality-report.view';

export interface DataQualityReportResult {
  readonly meters: readonly MeterDataQualityReport[];
  readonly predictors: readonly PredictorDataQualityReport[];
  readonly annualTotals: readonly DataQualityAnnualTotals[];
}

type QualityInput = { readonly kind: 'meter'; readonly input: DataQualityMeterInput }
  | { readonly kind: 'predictor'; readonly input: DataQualityPredictorInput }
  | { readonly kind: 'annual'; readonly input: CalanderizedMeter; readonly displayEmissions: boolean; readonly emissionsMultiplier: number };

@Injectable()
export class DataQualityReportService {
  readonly editor = inject(DataQualityReportEditor);
  readonly context = this.editor.context;
  private readonly injector = inject(Injector);
  private readonly annualEnabled = computed(() => this.context.stage() === 'report'
    && this.editor.draft().settings.includeAnnualTotalsTable && this.editor.setupValid()
    && this.editor.selection().meters.length > 0 && this.context.workspace.isReady()
    && !this.context.workspace.hasPending() && ['idle', 'saved'].includes(this.editor.state()));
  private readonly calendarization = toSignal(toObservable(this.annualEnabled).pipe(switchMap(enabled => enabled
    ? this.injector.get(WorkspaceCalendarizationService).calendarizeBase() : of(IDLE_WORKSPACE_CALENDARIZATION))),
    { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  private readonly request = computed<ReportResultRequest<DataQualityReportResult, readonly QualityInput[]>>(() => {
    const context = this.context, workspace = context.workspace, report = context.report();
    const key = `${context.key()}:${context.stage()}`;
    if (!report || report.facilityReportType !== 'dataQuality' || context.stage() !== 'report') return { state: { key, state: 'idle' } };
    if (workspace.status() === 'error') return { state: { key, state: 'error', message: 'The workspace could not be loaded. Reload the workspace before preparing this report.' } };
    if (!workspace.isReady() || workspace.hasPending() || !['idle', 'saved'].includes(this.editor.state())) {
      return { state: { key, state: 'waiting', message: 'Waiting for saved report settings and current workspace data…' } };
    }
    if (!this.editor.setupValid()) return { state: { key, state: 'error', message: 'The report selection is unavailable or incomplete. Review Setup before continuing.' } };
    const settings = this.editor.draft().settings;
    const meterDemand = settings.includeMeterStatisticsTable || settings.includeMeterConsumptionTimeseriesGraph || settings.includeMeterCostTimeseriesGraph
      || settings.includeMeterConsumptionHistogram || settings.includeMeterCostHistogram || settings.includeAnnualTotalsTable;
    const predictorDemand = settings.includePredictorStatisticsTable || settings.includePredictorTimeseriesGraph || settings.includePredictorHistogram;
    try {
      const meters = meterDemand ? buildDataQualityMeterInputs(workspace.snapshot()!, report.facilityId,
        this.editor.selection().meters.map(meter => meter.guid)) : [];
      const predictors = predictorDemand ? buildDataQualityPredictorInputs(workspace.snapshot()!, report.facilityId,
        this.editor.selection().predictors.map(predictor => predictor.guid)) : [];
      const inputs: QualityInput[] = [
        ...meters.map(input => ({ kind: 'meter' as const, input })),
        ...predictors.map(input => ({ kind: 'predictor' as const, input }))
      ];
      if (settings.includeAnnualTotalsTable && meters.length) {
        const base = this.calendarization(), calendarization = this.injector.get(WorkspaceCalendarizationService);
        if (!['ready', 'error'].includes(base.state) || base.inputFingerprint !== calendarization.currentInputFingerprint()) {
          return { state: { key, state: 'waiting', message: 'Preparing current annual totals…' } };
        }
        if (base.state === 'error') return { state: { key, state: 'error', message: base.error?.message ?? 'Annual totals could not be prepared. Retry.' } };
        const displayEmissions = workspace.snapshot()!.account.displayEmissions;
        const projection = calendarization.project(base, { context: { kind: 'facility', guid: report.facilityId },
          meterGuids: meters.map(input => input.meter.guid), includeEmissions: displayEmissions });
        if (projection.state !== 'ready') throw new Error(projection.error?.message ?? 'Annual totals could not be projected into the facility settings.');
        const canonicalMeters = new Map(base.meters.map(meter => [meter.meter.guid, meter]));
        inputs.push(...projection.meters.map(input => ({ kind: 'annual' as const, input, displayEmissions,
          emissionsMultiplier: dataQualityAnnualEmissionsMultiplier(canonicalMeters.get(input.meter.guid)!, input) })));
      }
      const content = JSON.stringify([context.key(), inputs]);
      return {
        state: { key, state: 'ready', value: { meters: [], predictors: [], annualTotals: [] } },
        ...(inputs.length ? { calculation: { content, request: inputs } } : {})
      };
    } catch (error) {
      return { state: { key, state: 'error', message: error instanceof Error ? error.message : 'Report inputs are unavailable. Review Setup.' } };
    }
  });
  private readonly results = new ReportResultController({
    request: this.request, loadingMessage: 'Preparing statistics and charts…', waitingMessage: 'Checking current report readings…',

    execute: (inputs: readonly QualityInput[]) => scheduled(inputs, asyncScheduler).pipe(
      map(task => task.kind === 'annual'
        ? { kind: 'annual' as const, report: buildDataQualityAnnualTotals(task.input, task.displayEmissions, task.emissionsMultiplier) }
        : task.kind === 'meter'
        ? { kind: 'meter' as const, report: buildMeterDataQualityReport(task.input.readings, task.input.meter) }
        : { kind: 'predictor' as const, report: buildPredictorDataQualityReport(task.input.readings, task.input.predictor) }),
      toArray(), map(results => ({
        meters: results.filter(result => result.kind === 'meter').map(result => result.report),
        predictors: results.filter(result => result.kind === 'predictor').map(result => result.report),
        annualTotals: results.filter(result => result.kind === 'annual').map(result => result.report)
      }))),
    project: (_value: DataQualityReportResult, result: DataQualityReportResult) => result
  });
  readonly state = this.results.state;
  readonly exportSnapshot = computed(() => {
    const state = this.state(), report = this.context.report();
    if (state.state !== 'ready' || !state.value || !report) return undefined;
    const facility = this.context.workspace.snapshot()?.facilities.find(item => item.guid === report.facilityId);
    if (!facility) return undefined;
    return buildDataQualityReportSnapshot(report, facility, this.editor.draft().settings, state.value);
  });
  retry(): void {
    if (this.annualEnabled()) this.injector.get(WorkspaceCalendarizationService).retry();
    this.results.retry();
  }
}
