import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { calculateModelingReport } from '@domain/reports/modeling-report-calculation';
import { getAllYearsWithDataAccount } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { projectWorkspaceCalendarization } from '@app/v1/shared/calendarization/workspace-calendarization-projection';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { AccountModelingReportEditor } from './editing/modeling-report-editor.service';
import { AccountModelingReportService } from './modeling-report.service';
import { accountModelingSnapshot, addSecondModelingFacility, modelingBase } from './testing/modeling-report-test-fixtures';

describe('account Modeling report session', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(category: 'energy' | 'water' = 'energy', multiple = false) {
    const original = accountModelingSnapshot(category);
    if (multiple) addSecondModelingFacility(original);
    const snapshot = signal(original), stage = signal('setup'), pending = signal(false);
    const report = computed(() => snapshot().accountReports[0]);
    const execute = vi.fn((request: AnalysisReportWorkerRequest) => {
      if (request.operation !== 'modeling') throw new Error('Unexpected calculation');
      return of<AnalysisReportWorkerResponse>({ ok: true, operation: 'modeling', value: request.years.map(year =>
        calculateModelingReport(request.inputs, year, request.chartMeters, request.includeModelDetails, request.availableYears)) });
    });
    const project = vi.fn((_base, request) => projectWorkspaceCalendarization(modelingBase(snapshot()), snapshot(), request));
    const editor = { context: { report, stage, key: () => 'account:report', workspace: {
      status: () => 'ready', isReady: () => true, hasPending: pending, snapshot,
      account: computed(() => snapshot().account), facilities: computed(() => snapshot().facilities),
      meterGroups: computed(() => snapshot().meterGroups), predictors: computed(() => snapshot().predictors)
    } }, state: () => 'saved', setupValid: () => true, periodsCurrent: () => true, base: () => modelingBase(snapshot()),
      periods: () => getAllYearsWithDataAccount(modelingBase(snapshot()).meters, snapshot().account),
      draft: computed(() => ({ settings: {
        includeIssuesSummary: report().analysisReportSetup.includeProblemsInformation,
        includeExecutiveSummary: report().analysisReportSetup.includeExecutiveSummary,
        includeDataValidationTables: report().analysisReportSetup.includeDataValidationTables
      } })) };
    TestBed.configureTestingModule({ providers: [AccountModelingReportService,
      { provide: AccountModelingReportEditor, useValue: editor }, { provide: WorkspaceCalendarizationService, useValue: { project } },
      { provide: AnalysisReportCalculationService, useValue: { execute } }] });
    const service = TestBed.inject(AccountModelingReportService); TestBed.tick();
    return { service, snapshot, stage, pending, execute, project };
  }
  async function ready(service: AccountModelingReportService) {
    await vi.waitFor(() => { TestBed.tick(); expect(service.state()).toMatchObject({ state: 'ready' }); });
  }
  it.each(['energy', 'water'] as const)('uses account-qualified %s diagnostics and accepts baseline years without charts', async category => {
    const { service, stage, snapshot, execute, project } = setup(category);
    expect(execute).not.toHaveBeenCalled();
    snapshot.update(value => ({ ...value, accountReports: value.accountReports.map(report => ({ ...report, reportYear: 2022,
      analysisReportSetup: { ...report.analysisReportSetup, includeDataValidationTables: false } })) }));
    stage.set('report'); await ready(service);
    expect(execute.mock.calls[0][0]).toMatchObject({ operation: 'modeling', years: [2022], chartMeters: [], includeModelDetails: false });
    expect(project).not.toHaveBeenCalled();
    expect(service.view()).toMatchObject({ scope: 'account', reportYear: 2022, groups: [{ facilityName: 'Plant A', groupName: 'Main meters' }] });
    expect(service.exportSnapshot()).toMatchObject({ name: 'Portfolio modeling', scopeName: 'Portfolio' });
  });
  it('projects portfolio charts in each facility analysis unit and fiscal calendar', async () => {
    const { service, stage, project } = setup('energy', true);
    stage.set('report'); await ready(service);
    expect(project.mock.calls.map(call => call[1])).toEqual([
      expect.objectContaining({ context: { kind: 'facility', guid: 'facility' }, energyUnit: 'MMBtu', energyIsSource: true }),
      expect.objectContaining({ context: { kind: 'facility', guid: 'facility-b' }, energyUnit: 'kWh', energyIsSource: false })
    ]);
    const groups = service.view()!.regression;
    expect(groups.map(group => group.facilityName)).toEqual(['Plant A', 'Plant B']);
    expect(groups.map(group => group.chart!.unit)).toEqual(['MMBtu', 'kWh']);
    expect(groups[0].chart!.monthly.at(-1)!.date).toEqual(new Date(2023, 11, 1));
    expect(groups[1].chart!.monthly.at(-1)!.date).toEqual(new Date(2023, 5, 1));
    const january = groups.map(group => group.chart!.monthly.find(row => row.date.getFullYear() === 2023 && row.date.getMonth() === 0)!.energyUse!);
    expect(january[1]).toBeGreaterThan(january[0]);
  });
  it('reprojects names, invalidates predictor diagnostics, and suppresses stale results', async () => {
    const { service, stage, snapshot, execute, pending } = setup(); stage.set('report'); await ready(service);
    snapshot.update(value => ({ ...value, facilities: value.facilities.map(facility => ({ ...facility, name: 'Renamed plant' })) }));
    await ready(service); expect(execute).toHaveBeenCalledTimes(1); expect(service.view()!.groups[0].facilityName).toBe('Renamed plant');
    const late = new Subject<AnalysisReportWorkerResponse>(); execute.mockReturnValueOnce(late);
    snapshot.update(value => ({ ...value, predictors: value.predictors.map(predictor => ({ ...predictor, name: predictor.name + ' revised' })) }));
    expect(service.view()).toBeUndefined(); TestBed.tick();
    pending.set(true); TestBed.tick(); late.next({ ok: false, message: 'Obsolete' }); pending.set(false);
    await ready(service); expect(service.view()!.regression[0].model!.predictorVariables[0].name).toContain('revised');
    stage.set('setup'); TestBed.tick(); stage.set('report'); await ready(service); expect(execute).toHaveBeenCalledTimes(3);
  });
  it('reuses current results when an unselected facility adds another available year', async () => {
    const { service, snapshot, stage, execute } = setup('energy', true);
    snapshot.update(value => ({ ...value, accountAnalyses: value.accountAnalyses.map(analysis => ({ ...analysis,
      facilityAnalysisItems: analysis.facilityAnalysisItems.filter(link => link.facilityId === 'facility') })) }));
    stage.set('report'); await ready(service);
    const current = service.view();
    const laterReadings = snapshot().meterData.filter(row => row.facilityId === 'facility-b')
      .map(row => ({ ...row, id: row.id + 10000, guid: row.guid + '-later', year: 2026 }));
    expect(getAllYearsWithDataAccount(modelingBase(snapshot()).meters, snapshot().account)).not.toContain(2026);
    snapshot.update(value => ({ ...value, meterData: [...value.meterData, ...laterReadings] }));
    expect(getAllYearsWithDataAccount(modelingBase(snapshot()).meters, snapshot().account)).toContain(2026);
    await ready(service);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(service.view()).toEqual(current);
  });
  it('diagnoses an offered account year even when only an unselected facility has that year of data', async () => {
    const { service, snapshot, stage, execute } = setup('energy', true);
    snapshot.update(value => ({ ...value,
      accountReports: value.accountReports.map(report => ({ ...report, reportYear: 2026 })),
      accountAnalyses: value.accountAnalyses.map(analysis => ({ ...analysis,
        facilityAnalysisItems: analysis.facilityAnalysisItems.filter(link => link.facilityId === 'facility') })),
      meterData: value.meterData.filter(row => row.facilityId === 'facility-b' || row.year < 2024)
        .map(row => row.facilityId === 'facility-b' ? { ...row, year: 2026 } : row)
    }));
    stage.set('report'); await ready(service);
    const request = execute.mock.calls[0][0];
    expect(request.operation).toBe('modeling');
    if (request.operation !== 'modeling') return;
    expect(request.availableYears).toContain(2026);
    expect(Math.max(...request.inputs.meterData.map(row => row.year))).toBe(2023);
    expect(service.view()).toMatchObject({ reportYear: 2026, groups: [{ chart: { throughYear: 2023 } }] });
    // Even if setup readiness has not caught up, a removed period cannot reuse successful checks.
    snapshot.update(value => ({ ...value, meterData: value.meterData.filter(row => row.facilityId !== 'facility-b') }));
    expect(service.view()).toBeUndefined();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(service.state()).toMatchObject({ state: 'error', message: expect.stringContaining('available meter history') });
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });
  it('shows projection errors with retry and keeps missing models diagnostic', async () => {
    const { service, stage, project, snapshot } = setup();
    project.mockImplementationOnce(() => ({ state: 'error', meters: [], accountGuid: 'account', inputFingerprint: 'current',
      error: { code: 'invalid-projection', message: 'Invalid chart unit' } }));
    stage.set('report'); TestBed.tick(); expect(service.state()).toMatchObject({ state: 'error', message: 'Invalid chart unit' });
    snapshot.update(value => ({ ...value, facilityAnalyses: value.facilityAnalyses.map(analysis => ({ ...analysis,
      groups: analysis.groups.map(group => ({ ...group, isGeneratedModel: true, selectedModelId: undefined })) })) }));
    service.retry(); await ready(service); expect(service.view()!.issues[0].rows).toHaveLength(1);
  });
});
