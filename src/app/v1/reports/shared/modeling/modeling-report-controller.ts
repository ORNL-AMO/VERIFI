import { Signal, computed, inject } from '@angular/core';
import { map } from 'rxjs';
import { CalanderizedMeter } from '@data/models/calanderization';
import { CheckedAnalysisReportInputs, analysisReportLinks } from '@domain/reports/analysis-report-inputs';
import { buildModelingReport, ModelingReportChecks, ModelingReportView, modelingReportContent, prepareModelingReportInputs } from '@domain/reports/modeling-report';
import { AnalysisReportWorkerRequest } from '@platform/web-workers/analysis-report-worker.contract';
import { WorkspaceCalendarizationProjectionRequest, WorkspaceCalendarizationProjectionResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { ReportEditor } from '../workbench/report-runtime.models';
import { AnalysisReportCalculationService } from '../calculation/analysis-report-calculation.service';
import { ReportResultController, ReportResultRequest } from '../calculation/report-result-controller';
import { ReportResultState } from '../calculation/report-result-state';
import { ModelingReportExportSnapshot } from './output/modeling-report-output';

type ModelingWorkerRequest = Extract<AnalysisReportWorkerRequest, { readonly operation: 'modeling' }>;
export type ModelingRequest = ReportResultRequest<ModelingReportChecks, ModelingWorkerRequest>;

/** Project each selected analysis in its own units and fiscal calendar, never the account's display units. */
export function modelingCalculationRequest(key: string, raw: CheckedAnalysisReportInputs, reportYear: number,
  details: boolean, project: (request: WorkspaceCalendarizationProjectionRequest) => WorkspaceCalendarizationProjectionResult,
  availableYears?: readonly number[]): ModelingRequest {
  const inputs = prepareModelingReportInputs(raw);
  const chartMeters: CalanderizedMeter[] = [];
  if (details) for (const link of analysisReportLinks(inputs)) {
    if (!link.analysisItemId || link.analysisItemId === 'skip') continue;
    const analysis = inputs.facilityAnalyses.find(item => item.guid === link.analysisItemId && item.facilityId === link.facilityId)!;
    const projection = project({ context: { kind: 'facility', guid: link.facilityId },
      meterGuids: inputs.meters.filter(meter => meter.facilityId === link.facilityId).map(meter => meter.guid),
      energyUnit: analysis.energyUnit, waterUnit: analysis.waterUnit, energyIsSource: analysis.energyIsSource, includeEmissions: false });
    if (projection.state === 'error') throw new Error(projection.error?.message ?? 'Model chart data could not be prepared. Review the linked analysis setup and retry.');
    chartMeters.push(...projection.meters);
  }
  // Other available periods do not change this result; losing the selected period must invalidate it.
  const yearAvailable = availableYears?.includes(reportYear);
  return { state: { key, state: 'ready', value: { reportYear, groups: [], hasBlockingErrors: false } },
    calculation: { content: JSON.stringify([key, modelingReportContent(inputs, reportYear), details, yearAvailable]),
      request: { operation: 'modeling', inputs, years: [reportYear], chartMeters, includeModelDetails: details,
        ...(availableYears ? { availableYears } : {}) } } };
}

/** One shared calculation/result/presentation lifetime per immutable report session. */
export class ModelingReportController {
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly results: ReportResultController<ModelingReportChecks, ModelingWorkerRequest, ModelingReportChecks>;
  readonly state: Signal<ReportResultState<ModelingReportChecks>>;
  readonly view: Signal<ModelingReportView | undefined>;
  readonly exportSnapshot: Signal<ModelingReportExportSnapshot | undefined>;

  constructor(adapter: {
    request: Signal<ModelingRequest>;
    settings: Signal<Parameters<typeof buildModelingReport>[1]>;
    names: Signal<Parameters<typeof buildModelingReport>[2]>;
    scope: 'facility' | 'account';
    identity: Signal<string>;
    title: Signal<string>;
    scopeName: Signal<string>;
  }) {
    this.results = new ReportResultController({ request: adapter.request,
      loadingMessage: 'Preparing the modeling report…', waitingMessage: 'Checking current modeling inputs…',
      execute: (request: ModelingWorkerRequest) => this.calculations.execute(request).pipe(map(response => {
        if (response.ok === false) throw new Error(response.message);
        if (response.operation !== 'modeling' || response.value.length !== 1 || response.value[0].reportYear !== request.years[0]) {
          throw new Error('The modeling calculation returned no matching results.');
        }
        return response.value[0];
      })), project: (_value: ModelingReportChecks, result: ModelingReportChecks) => result });
    this.state = this.results.state;
    this.view = computed(() => {
      const state = this.state();
      return state.state === 'ready' && state.value
        ? buildModelingReport(state.value, adapter.settings(), adapter.names(), adapter.scope) : undefined;
    });
    this.exportSnapshot = computed<ModelingReportExportSnapshot | undefined>(() => {
      const view = this.view();
      return view ? { identity: adapter.identity(), name: adapter.title(), scopeName: adapter.scopeName(), view } : undefined;
    });
  }
  retry(): void { this.results.retry(); }
}

/** Output adapters depend only on current report readiness, not a facility or account feature. */
export interface ModelingReportOutputSource {
  readonly context: { readonly stage: () => string };
  readonly editor: Pick<ReportEditor, 'setupValid' | 'flush'>;
  readonly state: ModelingReportController['state'];
  readonly exportSnapshot: ModelingReportController['exportSnapshot'];
}
