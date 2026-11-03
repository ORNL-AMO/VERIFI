import { Injectable, Injector, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { FacilityAnalysisReportInputs, buildFacilityAnalysisReportInputs, assertAnalysisReportYears } from '@domain/reports/analysis-report-inputs';
import { analysisReviewContent } from '@domain/reports/analysis-review-inputs';
import { getYearsWithFullData } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { AnalysisChecksController, AnalysisChecksRequest, AnalysisChecksResult } from '@app/v1/reports/shared/analysis-checks/analysis-checks-controller';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { ReportResultState } from '@app/v1/reports/shared/calculation/report-result-state';
import { ReportResultController, ReportResultRequest } from '@app/v1/reports/shared/calculation/report-result-controller';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { FacilityAnalysisResultsValue, FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { FacilityReportWorkbenchContext } from '../workbench/facility-report-workbench-context.service';
import { AnalysisReportEditor } from './editing/analysis-report-editor.service';

export interface FacilityAnalysisReportResult extends AnalysisChecksResult<FacilityAnalysisReportInputs> {
  readonly results?: FacilityAnalysisResultsValue;
}

@Injectable()
export class FacilityAnalysisReportService {
  readonly context = inject(FacilityReportWorkbenchContext);
  readonly editor = inject(AnalysisReportEditor);
  private readonly calculations = inject(AnalysisReportCalculationService);
  private readonly injector = inject(Injector);
  private readonly enabled = computed(() => this.context.report()?.facilityReportType === 'analysis');
  private readonly base = toSignal(toObservable(this.enabled).pipe(switchMap(enabled => enabled
    ? this.injector.get(WorkspaceCalendarizationService).calendarizeBase() : of(IDLE_WORKSPACE_CALENDARIZATION))), { initialValue: IDLE_WORKSPACE_CALENDARIZATION });
  readonly calendarizationState = computed(() => this.base().state);
  readonly periods = computed(() => {
    const base = this.base(), facility = this.context.facility(), analysis = this.editor.selectedAnalysis();
    if (base.state !== 'ready' || !facility) return [];
    const projection = this.injector.get(WorkspaceCalendarizationService).project(base, { context: { kind: 'facility', guid: facility.guid },
      energyUnit: analysis?.energyUnit ?? facility.energyUnit, waterUnit: analysis?.waterUnit ?? facility.volumeLiquidUnit,
      energyIsSource: analysis?.energyIsSource ?? facility.energyIsSource, includeEmissions: false });
    return projection.state === 'ready' ? getYearsWithFullData([...projection.meters], facility).filter(year =>
      !Number.isInteger(analysis?.baselineYear) || year >= analysis!.baselineYear) : [];
  });
  private readonly input = computed<AnalysisChecksRequest<FacilityAnalysisReportInputs>>(() => this.buildInput());
  readonly checks = new AnalysisChecksController<FacilityAnalysisReportInputs>(this.input, value => this.persistReview(value));
  readonly workflow = this.checks.workflow;
  private readonly request = computed<ReportResultRequest<FacilityAnalysisReportResult, FacilityAnalysisResultsWorkerRequest>>(() => {
    const checks = this.checks.state(), input = this.input(), report = this.context.report();
    let request: FacilityAnalysisResultsWorkerRequest | undefined;
    if (checks.state === 'ready' && checks.value?.completed && input.inputs && report && this.context.stage() === 'report') {
      const inputs = input.inputs, facility = inputs.facilities[0], base = this.base();
      if (base.state === 'ready') {
        const groupIds = new Set(inputs.facilityAnalyses.flatMap(item => item.groups)
          .filter(group => !['skip', 'skipAnalysis'].includes(group.analysisType)).map(group => group.idbGroupId));
        const projection = this.injector.get(WorkspaceCalendarizationService).project(base, {
          context: { kind: 'facility', guid: facility.guid }, meterGuids: inputs.meters.filter(meter => groupIds.has(meter.groupId)).map(meter => meter.guid),
          energyUnit: inputs.analysis.energyUnit, waterUnit: inputs.analysis.waterUnit, energyIsSource: inputs.analysis.energyIsSource, includeEmissions: false });
        if (projection.state === 'ready') request = structuredClone({ analysisItem: inputs.analysis, facility, calanderizedMeters: projection.meters,
          accountPredictorEntries: inputs.predictorData, accountPredictors: inputs.predictors, accountAnalysisItems: inputs.facilityAnalyses,
          calculateAllMonthlyData: false, includeGroupSummaries: true, reportYear: report.analysisReportSettings.reportYear });
      }
    }
    const content = request && input.inputs ? analysisReviewContent(input.inputs, request.reportYear!) : undefined;
    const state: ReportResultState<FacilityAnalysisReportResult> = { ...checks, key: JSON.stringify([checks.key, content]) };
    if (state.state !== 'ready' || !state.value || this.context.stage() !== 'report') return { state };
    if (!state.value.completed) return { state: { ...state, state: 'review-required',
      message: state.value.blocked ? 'Resolve blocking analysis issues before displaying this report.' : 'Review Data Checks and acknowledge the issues before displaying this report.' } };
    if (!request || !content) return { state: { key: state.key, state: 'waiting', message: 'Waiting for facility calendarization…' } };
    return { state, calculation: { content, request } };
  });
  private readonly results = new ReportResultController({
    request: this.request,
    loadingMessage: 'Preparing the facility analysis report…', waitingMessage: 'Checking current report inputs…',
    execute: request => this.calculations.executeFacility(request).pipe(map(response => {
      if (response.ok === false) throw new Error(response.message);
      if (response.value.itemId !== request.analysisItem.guid || !response.value.annualAnalysisSummaries.length) throw new Error('The report calculation returned no matching results.');
      return response.value;
    })),
    project: (value, results) => ({ ...value, results })
  });
  readonly state = this.results.state;
  readonly checksRoute = computed(() => this.context.navigation.facilityReportWorkbenchRoute(this.context.report()?.facilityId ?? '', this.context.guid(), 'data-checks'));
  readonly setupRoute = computed(() => this.context.navigation.facilityReportWorkbenchRoute(this.context.report()?.facilityId ?? '', this.context.guid()));
  readonly groupNames = computed(() => Object.fromEntries(this.context.workspace.meterGroups().map(item => [item.guid, item.name])));
  readonly facilityNames = computed(() => Object.fromEntries(this.context.workspace.facilities().map(item => [item.guid, item.name])));
  retry(): void {
    if (this.base().state === 'error' || this.context.status.state() === 'error') this.injector.get(WorkspaceCalendarizationService).retry();
    this.results.retry(); this.checks.retry();
  }
  confirmReview(): Promise<void> { return this.checks.confirmReview(); }
  private async persistReview(value: AnalysisChecksResult<FacilityAnalysisReportInputs>): Promise<void> {
    const inputs = value.inputs;
    await this.injector.get(WorkspaceCommandBoundary).execute({ entityKind: 'facilityAnalysis', changeKind: 'update',
      entityGuid: inputs.analysis.guid, label: 'Confirming analysis review', notification: { suppressSuccessToast: true },
      publication: { mode: 'patch', buildPatch: saved => ({ collections: [{ collection: 'facilityAnalyses', upsert: [saved.analysis] }] }) }
    }, () => this.injector.get(AnalysisReviewCommandHandler).confirmFacility(inputs.account.guid, inputs.analysis.facilityId, inputs.analysis.guid, inputs, value.years));
  }
  private buildInput(): AnalysisChecksRequest<FacilityAnalysisReportInputs> {
    const report = this.context.report(), stage = this.context.stage(), workspace = this.context.workspace, key = `${this.context.key()}:${stage}`;
    if (!report || report.facilityReportType !== 'analysis') return { key, state: 'idle' };
    const wait = (message: string): AnalysisChecksRequest<FacilityAnalysisReportInputs> => ({ key, state: 'waiting', message });
    if (!workspace.isReady() || !workspace.canWrite() || workspace.hasPending()) return wait('Waiting for the account workspace…');
    if (!['idle', 'saved'].includes(this.editor.state())) return wait('Save or discard report changes before continuing.');
    if (this.context.status.state() === 'error' || this.base().state === 'error') return { key, state: 'error', message: 'Workspace validation or calendarization failed. Retry before continuing.' };
    if (this.context.status.state() !== 'ready' || this.base().state !== 'ready') return wait('Waiting for workspace validation and calendarization…');
    try {
      const inputs = buildFacilityAnalysisReportInputs(workspace.snapshot()!, report.facilityId, report.analysisItemId);
      const year = report.analysisReportSettings.reportYear;
      assertAnalysisReportYears(inputs, [year]);
      if (!this.periods().includes(year)) throw new Error('The selected report year is unavailable. Review the reporting period in Setup.');
      const findings = this.context.findings();
      return { key, state: 'calculate', demand: stage === 'setup' ? 'freshness' : 'checks',
        inputs, years: [year], reviews: inputs.analysis.dataCheckReviews ?? [], blocking: findings.some(item => item.severity === 'error'),
        warnings: findings.some(item => item.severity === 'warning') };
    } catch (error) { return { key, state: 'error', message: error instanceof Error ? error.message : 'Complete report setup before continuing.' }; }
  }
}
