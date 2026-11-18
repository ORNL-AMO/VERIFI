import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { ModelingReportEditor } from './editing/modeling-report-editor.service';
import { FacilityModelingReportService } from './modeling-report.service';
import { modelingSnapshot } from './testing/modeling-report-test-fixtures';

describe('Modeling report result session', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const snapshot = signal(modelingSnapshot()), stage = signal('setup'), pending = signal(false), saved = signal('saved');
    const report = computed(() => snapshot().facilityReports[0]);
    const execute = vi.fn((request: AnalysisReportWorkerRequest) => of<AnalysisReportWorkerResponse>({ ok: true, operation: 'checks',
      value: request.years.map(year => calculateAnalysisDataChecks(request.inputs, year)) }));
    const editor = { context: { report, stage, facility: computed(() => snapshot().facilities[0]), key: () => 'account:facility:modeling-report',
      workspace: { status: () => 'ready', isReady: () => true, hasPending: pending, snapshot,
        facilities: computed(() => snapshot().facilities), meterGroups: computed(() => snapshot().meterGroups), predictors: computed(() => snapshot().predictors) } },
      state: saved, setupValid: () => true, base: () => ({ state: 'ready' }), periodsCurrent: () => true,
      draft: computed(() => ({ settings: report().modelingReportSettings })) };
    TestBed.configureTestingModule({ providers: [FacilityModelingReportService,
      { provide: ModelingReportEditor, useValue: editor }, { provide: AnalysisReportCalculationService, useValue: { execute } }] });
    const service = TestBed.inject(FacilityModelingReportService); TestBed.tick();
    return { service, snapshot, stage, pending, saved, execute };
  }
  async function ready(service: FacilityModelingReportService) {
    await vi.waitFor(() => { TestBed.tick(); expect(service.state().state).toBe('ready'); });
  }
  it('calculates only on Report, retains diagnostic failures, and reuses results across presentation changes', async () => {
    const { service, snapshot, stage, execute } = setup(); expect(execute).not.toHaveBeenCalled();
    snapshot.update(value => ({ ...value, facilityAnalyses: value.facilityAnalyses.map(analysis => ({ ...analysis,
      groups: analysis.groups.map(group => ({ ...group, isGeneratedModel: true, selectedModelId: undefined })) })) }));
    stage.set('report'); await ready(service);
    expect(service.view()!.issues[0].rows).toHaveLength(1); expect(execute).toHaveBeenCalledTimes(1);
    snapshot.update(value => ({ ...value, facilityReports: value.facilityReports.map(report => ({ ...report, name: 'New title',
      modelingReportSettings: { ...report.modelingReportSettings, includeExecutiveSummary: false } })),
      meterGroups: value.meterGroups.map(group => ({ ...group, name: 'Renamed group' })) }));
    await ready(service); expect(execute).toHaveBeenCalledTimes(1); expect(service.view()!.groups[0].groupName).toBe('Renamed group');
    expect(service.exportSnapshot()).toMatchObject({ identity: 'account:facility:modeling-report', name: 'New title',
      scopeName: 'Plant A', view: { reportYear: 2023, settings: { includeExecutiveSummary: false } } });
    stage.set('setup'); TestBed.tick(); expect(service.view()).toBeUndefined();
    stage.set('report'); await ready(service); expect(execute).toHaveBeenCalledTimes(1);
  });
  it('refreshes predictor names inside diagnostic messages when the source predictor is renamed', async () => {
    const { service, snapshot, stage, execute } = setup(); stage.set('report'); await ready(service);
    snapshot.update(value => ({ ...value, predictors: value.predictors.map((predictor, i) => i ? predictor : { ...predictor, name: 'Renamed predictor' }) }));
    await ready(service); expect(execute).toHaveBeenCalledTimes(2);
    expect(service.view()!.regression[0].model!.predictorVariables[0].name).toBe('Renamed predictor');
    expect(service.view()!.regression[0].model!.SEPValidation[0].predictorVariable).toBe('Renamed predictor');
  });
  it('immediately hides stale content, cancels changed inputs, and rejects late replies', async () => {
    const { service, snapshot, stage, execute, pending } = setup();
    const late = new Subject<AnalysisReportWorkerResponse>(); execute.mockReturnValueOnce(late);
    stage.set('report'); TestBed.tick(); expect(service.state().state).toBe('loading');
    snapshot.update(value => ({ ...value, predictorData: value.predictorData.map((row, i) => i ? row : { ...row, amount: 999 }) }));
    expect(service.view()).toBeUndefined(); await ready(service);
    const current = service.state().value; late.next({ ok: false, message: 'Obsolete failure' });
    TestBed.tick(); expect(service.state().value).toBe(current);
    pending.set(true); expect(service.view()).toBeUndefined(); TestBed.tick();
    pending.set(false); await ready(service); expect(execute).toHaveBeenCalledTimes(2);
  });
  it('reports calculation errors and retries against current inputs', async () => {
    const { service, stage, execute } = setup(); execute.mockReturnValueOnce(throwError(() => new Error('Worker failed')));
    stage.set('report'); await vi.waitFor(() => { TestBed.tick(); expect(service.state().state).toBe('error'); });
    expect(service.state().message).toContain('Worker failed'); service.retry(); await ready(service);
  });
});
