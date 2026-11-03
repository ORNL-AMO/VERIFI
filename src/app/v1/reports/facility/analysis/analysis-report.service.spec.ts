import { ApplicationRef, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { analysisReviewContent } from '@domain/reports/analysis-review-inputs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { AnalysisReportCalculationService } from '@app/v1/reports/shared/calculation/analysis-report-calculation.service';
import { FacilityReportWorkbenchContext } from '../workbench/facility-report-workbench-context.service';
import { AnalysisReportEditor } from './editing/analysis-report-editor.service';
import { FacilityAnalysisReportService } from './analysis-report.service';

describe('facility analysis report coordinator', () => {
  let store: AccountWorkspaceStore;
  let service: FacilityAnalysisReportService;
  let execute: ReturnType<typeof vi.fn>, executeFacility: ReturnType<typeof vi.fn>, confirmFacility: ReturnType<typeof vi.fn>;
  const stage = signal<'setup' | 'data-checks' | 'report'>('setup');
  const findings = signal<{ severity: string }[]>([]);
  function fixture(category: 'energy' | 'water' = 'energy') {
    const snapshot = analysisReportFixture(category);
    const report = { ...getNewIdbFacilityReport('facility', 'account', 'analysis', []), id: 70, guid: 'facility-report', analysisItemId: 'facility-analysis' };
    report.analysisReportSettings.reportYear = 2023;
    return { ...snapshot, facilityReports: [report] };
  }
  beforeEach(() => {
    stage.set('setup'); findings.set([]); store = new AccountWorkspaceStore(); const snapshot = fixture(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    execute = vi.fn(request => of({ ok: true, operation: 'checks', value: request.years.map(year => calculateAnalysisDataChecks(request.inputs, year)) }));
    executeFacility = vi.fn(request => of({ ok: true, value: calculateFacilityAnalysisResults(request) }));
    confirmFacility = vi.fn(async (_account, _facility, _analysis, inputs, years) => ({ scope: 'facility', analysis: { ...store.facilityAnalyses()[0],
      dataCheckReviews: years.map(reportYear => ({ checksVersion: 1, reportYear, inputFingerprint: analysisReviewContent(inputs, reportYear), reviewedAt: '2026-01-01T00:00:00Z' })) } }));
    TestBed.configureTestingModule({ providers: [FacilityAnalysisReportService,
      { provide: AnalysisReportCalculationService, useValue: { execute, executeFacility, fingerprint: async content => content } },
      { provide: AnalysisReviewCommandHandler, useValue: { confirmFacility } },
      { provide: WorkspaceCommandBoundary, useValue: new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService) },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'ready' }), project: (_base, request) => {
        const current = store.snapshot()!, facility = current.facilities[0];
        return { state: 'ready', meters: getCalanderizedMeterData([...current.meters], [...current.meterData], facility, false,
          { energyIsSource: request.energyIsSource, neededUnits: request.energyUnit }, [], [], [facility], current.account.assessmentReportVersion, []) };
      } } },
      { provide: AnalysisReportEditor, useValue: { state: signal('idle'), selectedAnalysis: computed(() => store.facilityAnalyses()[0]) } },
      { provide: FacilityReportWorkbenchContext, useValue: { workspace: store, stage, findings, status: { state: signal('ready') },
        key: computed(() => 'account:facility:' + store.facilityReports()[0]?.guid), guid: () => store.facilityReports()[0]?.guid,
        report: computed(() => store.facilityReports()[0]), facility: computed(() => store.facilities()[0]),
        navigation: { facilityReportWorkbenchRoute: (_facility, _report, stage) => [stage ?? 'setup'] } } }
    ] });
    service = TestBed.inject(FacilityAnalysisReportService);
  });
  afterEach(() => TestBed.resetTestingModule());
  async function settle() { for (let step = 0; step < 3; step++) { TestBed.tick(); await TestBed.inject(ApplicationRef).whenStable(); } TestBed.tick(); }
  it.each(['energy', 'water'] as const)('does no checks/report work in Setup and calculates clean %s results once across report stage changes', async category => {
    const snapshot = fixture(category); store.publish(snapshot, { facility: snapshot.facilities[0] });
    await settle(); expect(execute).not.toHaveBeenCalled(); expect(executeFacility).not.toHaveBeenCalled();
    stage.set('report'); await settle();
    expect(service.state().value?.results?.annualAnalysisSummaries.map(row => row.year)).toEqual([2022, 2023]);
    expect(execute.mock.calls[0][0].years).toEqual([2023]);
    expect(executeFacility.mock.calls[0][0]).toMatchObject({ calculateAllMonthlyData: false, includeGroupSummaries: true, reportYear: 2023 });
    stage.set('data-checks'); await settle(); stage.set('report'); await settle();
    expect(executeFacility).toHaveBeenCalledOnce(); expect(confirmFacility).not.toHaveBeenCalled();
    expect(store.committedRevision()).toBeUndefined();
  });
  it('supports a baseline-only report and deduplicates its calculation period', async () => {
    const report = structuredClone(store.facilityReports()[0]); report.analysisReportSettings.reportYear = 2022;
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] });
    stage.set('report'); await settle();
    expect(execute.mock.calls[0][0].years).toEqual([2022]);
    expect(service.state().value?.results?.annualAnalysisSummaries.map(row => row.year)).toEqual([2022]);
  });
  it('requires explicit warning acknowledgment, shares it between reports and invalidates immediately on a dependency change', async () => {
    findings.set([{ severity: 'warning' }]); stage.set('report'); await settle();
    expect(service.state().state).toBe('review-required'); expect(executeFacility).not.toHaveBeenCalled();
    stage.set('data-checks'); await settle(); await service.confirmReview(); await settle();
    expect(confirmFacility.mock.calls[0].slice(0, 3)).toEqual(['account', 'facility', 'facility-analysis']);
    expect(confirmFacility.mock.calls[0][4]).toEqual([2023]); expect(service.workflow().completed).toBe(true);
    stage.set('report'); await settle(); expect(service.state().value?.results).toBeDefined();
    const snapshot = store.snapshot()!, report = { ...snapshot.facilityReports[0], id: 71, guid: 'copy' };
    store.publish({ ...snapshot, facilityReports: [report] }, { facility: snapshot.facilities[0] }); await settle();
    expect(service.workflow().completed).toBe(true); expect(confirmFacility).toHaveBeenCalledOnce();
    const changedReading = { ...store.meterData()[0], totalEnergyUse: 1 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changedReading] }] });
    expect(service.state().value?.results).toBeUndefined(); expect(service.workflow().completed).toBe(false);
    await settle(); expect(service.state().state).toBe('review-required');
  });
  it('reprojects names and content options without repeating calculations or changing review', async () => {
    stage.set('report'); await settle();
    const count = execute.mock.calls.length, report = store.facilityReports()[0];
    const renamed = { ...report, name: 'Renamed', analysisReportSettings: { ...report.analysisReportSettings, groupReports: false } };
    const facility = { ...store.facilities()[0], name: 'Updated plant name' };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [renamed] }, { collection: 'facilities', upsert: [facility] }] });
    await settle(); expect(executeFacility).toHaveBeenCalledOnce(); expect(execute).toHaveBeenCalledTimes(count);
    expect(service.state().value?.results).toBeDefined(); expect(store.facilityAnalyses()[0].dataCheckReviews).toBeUndefined();
  });
  it('cancels superseded Worker work, ignores late responses and retries failures', async () => {
    const pending = new Subject(); executeFacility.mockReturnValueOnce(pending);
    stage.set('report'); await settle(); expect(pending.observed).toBe(true);
    const report = structuredClone(store.facilityReports()[0]); report.analysisReportSettings.reportYear = 2024;
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] });
    expect(service.state().value?.results).toBeUndefined(); await settle(); expect(pending.observed).toBe(false);
    expect(service.state().value?.results?.reportYear).toBe(2024);
    pending.next({ ok: true, value: { reportYear: 1990 } }); expect(service.state().value?.results?.reportYear).toBe(2024);
    executeFacility.mockReturnValueOnce(throwError(() => new Error('Worker failed'))); service.retry(); await settle();
    expect(service.state()).toMatchObject({ state: 'error', message: 'Worker failed' });
    service.retry(); await settle(); expect(service.state().state).toBe('ready');
  });
  it('prevents acknowledgment and output for blocking findings or unavailable periods', async () => {
    findings.set([{ severity: 'error' }]); stage.set('report'); await settle();
    expect(service.workflow().completed).toBe(false); expect(service.workflow().canConfirm).toBe(false); expect(executeFacility).not.toHaveBeenCalled();
    await service.confirmReview(); expect(confirmFacility).not.toHaveBeenCalled();
    const report = structuredClone(store.facilityReports()[0]); report.analysisReportSettings.reportYear = 2021;
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] }); await settle();
    expect(service.state().state).toBe('error');
  });
});
