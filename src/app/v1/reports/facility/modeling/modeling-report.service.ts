import { Injectable, computed, inject } from '@angular/core';
import { map } from 'rxjs';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { buildModelingReport, modelingReportContent, prepareModelingReportInputs } from '@domain/reports/modeling-report';
import { AnalysisReportWorkerRequest } from '@platform/web-workers/analysis-report-worker.contract';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { ReportResultController, ReportResultRequest } from '@app/v1/reports/shared/calculation/report-result-controller';
import { ModelingReportEditor } from './editing/modeling-report-editor.service';

@Injectable()
export class FacilityModelingReportService {
  readonly editor = inject(ModelingReportEditor);
  readonly context = this.editor.context;
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly request = computed<ReportResultRequest<AnalysisDataChecks, AnalysisReportWorkerRequest>>(() => {
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
      return { state: { key, state: 'ready', value: { reportYear, groups: [], hasBlockingErrors: false } },
        calculation: { content: JSON.stringify([key, modelingReportContent(inputs, reportYear)]),
          request: { operation: 'checks', inputs, years: [reportYear] } } };
    } catch (error) { return { state: { key, state: 'error', message: error instanceof Error ? error.message : 'Report inputs are unavailable. Review Setup.' } }; }
  });
  private readonly results = new ReportResultController({
    request: this.request, loadingMessage: 'Preparing the modeling report…', waitingMessage: 'Checking current modeling inputs…',
    execute: (request: AnalysisReportWorkerRequest) => this.calculations.execute(request).pipe(map(response => {
      if (response.ok === false) throw new Error(response.message);
      if (response.operation !== 'checks' || response.value.length !== 1 || response.value[0].reportYear !== request.years[0]) {
        throw new Error('The modeling calculation returned no matching results.');
      }
      return response.value[0];
    })),
    project: (_value: AnalysisDataChecks, result: AnalysisDataChecks) => result
  });
  readonly state = this.results.state;
  readonly view = computed(() => {
    const state = this.state();
    return state.state === 'ready' && state.value ? buildModelingReport(state.value, this.editor.draft().settings, {
      facilities: Object.fromEntries(this.context.workspace.facilities().map(item => [item.guid, item.name])),
      predictors: Object.fromEntries(this.context.workspace.predictors().map(item => [item.guid, item.name])),
      groups: Object.fromEntries(this.context.workspace.meterGroups().map(item => [item.guid, item.name]))
    }) : undefined;
  });
  retry(): void { if (this.editor.base().state === 'error') this.editor.retryPeriods(); this.results.retry(); }
}
