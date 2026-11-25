import { Injectable, computed, inject, signal } from '@angular/core';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { ModelingReportController, ModelingRequest, modelingCalculationRequest } from '@app/v1/reports/shared/modeling/modeling-report-controller';
import { AccountModelingReportEditor } from './editing/modeling-report-editor.service';

@Injectable()
export class AccountModelingReportService {
  readonly editor = inject(AccountModelingReportEditor);
  readonly context = this.editor.context;
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly projectionRetry = signal(0);
  private readonly request = computed<ModelingRequest>(() => {
    const context = this.context, report = context.report(), key = context.key();
    if (!report || report.reportType !== 'analysis' || context.stage() !== 'report') return { state: { key, state: 'idle' } };
    if (context.workspace.status() === 'error') return { state: { key, state: 'error', message: 'The workspace could not be loaded. Reload before preparing this report.' } };
    if (this.editor.base().state === 'error') return { state: { key, state: 'error', message: 'Reporting years could not be loaded. Retry before continuing.' } };
    if (!context.workspace.isReady() || context.workspace.hasPending() || !['idle', 'saved'].includes(this.editor.state())
      || !this.editor.periodsCurrent()) return { state: { key, state: 'waiting', message: 'Waiting for saved settings and current workspace data…' } };
    if (!this.editor.setupValid()) return { state: { key, state: 'error', message: 'Complete the report name, analysis, and available report year in Setup.' } };
    try {
      this.projectionRetry();
      return modelingCalculationRequest(key, buildAnalysisReportInputs(context.workspace.snapshot()!, report.analysisReportSetup?.analysisItemId),
        report.reportYear, this.editor.draft().settings.includeDataValidationTables,
        request => this.calendarization.project(this.editor.base(), request), this.editor.periods());
    } catch (error) { return { state: { key, state: 'error', message: error instanceof Error ? error.message : 'Report inputs are unavailable. Review Setup.' } }; }
  });
  private readonly controller = new ModelingReportController({
    request: this.request, scope: 'account', identity: computed(() => this.context.key()),
    settings: computed(() => this.editor.draft().settings), title: computed(() => this.context.report()?.name ?? 'Modeling report'),
    scopeName: computed(() => this.context.workspace.account()?.name ?? ''),
    names: computed(() => ({
      facilities: Object.fromEntries(this.context.workspace.facilities().map(item => [item.guid, item.name])),
      predictors: Object.fromEntries(this.context.workspace.predictors().map(item => [item.guid, item.name])),
      groups: Object.fromEntries(this.context.workspace.meterGroups().map(item => [item.guid, item.name]))
    }))
  });
  readonly state = this.controller.state;
  readonly view = this.controller.view;
  readonly exportSnapshot = this.controller.exportSnapshot;
  retry(): void {
    if (this.editor.base().state === 'error') this.editor.retryPeriods();
    this.projectionRetry.update(attempt => attempt + 1);
    this.controller.retry();
  }
}
