import { Injectable, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { buildModelingReport, ModelingReportChecks, modelingReportContent, prepareModelingReportInputs } from '@domain/reports/modeling-report';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { AnalysisReportWorkerRequest } from '@platform/web-workers/analysis-report-worker.contract';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { ReportResultController, ReportResultRequest } from '@app/v1/reports/shared/calculation/report-result-controller';
import { ModelingReportEditor } from './editing/modeling-report-editor.service';
import { ModelingReportExportSnapshot } from '@app/v1/reports/shared/modeling/output/modeling-report-output';

@Injectable()
export class FacilityModelingReportService {
  readonly editor = inject(ModelingReportEditor);
  readonly context = this.editor.context;
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly projectionRetry = signal(0);
  private readonly request = computed<ReportResultRequest<ModelingReportChecks, AnalysisReportWorkerRequest>>(() => {
    const context = this.context, report = context.report(), key = context.key();
    if (!report || report.facilityReportType !== 'modeling' || context.stage() !== 'report') return { state: { key, state: 'idle' } };
    if (context.workspace.status() === 'error') return { state: { key, state: 'error', message: 'The workspace could not be loaded. Reload before preparing this report.' } };
    if (this.editor.base().state === 'error') return { state: { key, state: 'error', message: 'Reporting years could not be loaded. Retry before continuing.' } };
    if (!context.workspace.isReady() || context.workspace.hasPending() || !['idle', 'saved'].includes(this.editor.state())
      || !this.editor.periodsCurrent()) return { state: { key, state: 'waiting', message: 'Waiting for saved settings and current workspace data…' } };
    if (!this.editor.setupValid()) return { state: { key, state: 'error', message: 'Complete the report name, analysis, and available report year in Setup.' } };
    try {
      const inputs = prepareModelingReportInputs(buildFacilityAnalysisReportInputs(context.workspace.snapshot()!, report.facilityId, report.analysisItemId));
      const reportYear = report.modelingReportSettings.reportYear;
      const details = report.modelingReportSettings.includeDataValidationTables;
      let request: AnalysisReportWorkerRequest = { operation: 'checks', inputs, years: [reportYear] };
      if (details) {
        this.projectionRetry();
        const projection = this.calendarization.project(this.editor.base(), { context: { kind: 'facility', guid: report.facilityId },
          meterGuids: inputs.meters.map(meter => meter.guid), energyUnit: inputs.analysis.energyUnit,
          waterUnit: inputs.analysis.waterUnit, energyIsSource: inputs.analysis.energyIsSource, includeEmissions: false });
        if (projection.state === 'error') return { state: { key, state: 'error',
          message: projection.error?.message ?? 'Model chart data could not be prepared. Review the linked analysis setup and retry.' } };
        request = { operation: 'modeling', inputs, years: [reportYear], chartMeters: projection.meters };
      }
      return { state: { key, state: 'ready', value: { reportYear, groups: [], hasBlockingErrors: false } },
        calculation: { content: JSON.stringify([key, modelingReportContent(inputs, reportYear), details,
          inputs.analysis.energyUnit, inputs.analysis.waterUnit, inputs.analysis.energyIsSource]), request } };
    } catch (error) { return { state: { key, state: 'error', message: error instanceof Error ? error.message : 'Report inputs are unavailable. Review Setup.' } }; }
  });
  private readonly results = new ReportResultController({
    request: this.request, loadingMessage: 'Preparing the modeling report…', waitingMessage: 'Checking current modeling inputs…',
    execute: (request: AnalysisReportWorkerRequest) => this.calculations.execute(request).pipe(map(response => {
      if (response.ok === false) throw new Error(response.message);
      if ((response.operation !== 'checks' && response.operation !== 'modeling') || response.operation !== request.operation
        || response.value.length !== 1 || response.value[0].reportYear !== request.years[0]) {
        throw new Error('The modeling calculation returned no matching results.');
      }
      return response.value[0];
    })),
    project: (_value: ModelingReportChecks, result: ModelingReportChecks) => result
  });
  readonly state = this.results.state;
  readonly view = computed(() => {
    const state = this.state();
    return state.state === 'ready' && state.value ? buildModelingReport(state.value, this.editor.draft().settings, {
      facilities: Object.fromEntries(this.context.workspace.facilities().map(item => [item.guid, item.name])),
      predictors: Object.fromEntries(this.context.workspace.predictors().map(item => [item.guid, item.name])),
      groups: Object.fromEntries(this.context.workspace.meterGroups().map(item => [item.guid, item.name]))
    }, 'facility') : undefined;
  });
  readonly exportSnapshot = computed<ModelingReportExportSnapshot | undefined>(() => {
    const view = this.view(), report = this.context.report(), facility = this.context.facility();
    return view && report && facility ? { identity: this.context.key(), name: report.name, scopeName: facility.name, view } : undefined;
  });
  retry(): void {
    if (this.editor.base().state === 'error') this.editor.retryPeriods();
    this.projectionRetry.update(attempt => attempt + 1);
    this.results.retry();
  }
}
