import { ApplicationRef, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AnalysisReviewCommandHandler } from '@data/account-workspace/handlers/analysis-review-command-handler.service';
import { ANALYSIS_DATA_CHECKS_VERSION } from '@data/models/analysis-review';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReviewContent } from '@domain/reports/analysis-review-inputs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { analysisReportFixture, regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { AnalysisReportCalculationService } from '@app/v1/shared/reports/analysis-report-calculation.service';
import { AccountReportWorkbenchContext } from '../account-report-workbench/account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-workbench/account-report-autosave.service';
import { BetterPlantsReportService } from './better-plants-report.service';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';

function calculate(request: AnalysisReportWorkerRequest) {
  return of<AnalysisReportWorkerResponse>(request.operation === 'checks'
    ? { ok: true, operation: 'checks', value: request.years.map(year => calculateAnalysisDataChecks(request.inputs, year)) }
    : { ok: true, operation: 'better-plants', value: calculateBetterPlantsReport(request.inputs, request.years) });
}

describe('Better Plants workflow coordinator', () => {
  let store: AccountWorkspaceStore;
  const findings = signal<{ severity: string }[]>([]);
  const stage = signal<'setup' | 'data-checks' | 'report'>('setup');
  let service: BetterPlantsReportService;
  let execute: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    findings.set([]); stage.set('setup'); store = new AccountWorkspaceStore(); store.publish(analysisReportFixture());
    execute = vi.fn(calculate);
    const confirm = vi.fn(async (_account, _analysis, inputs, years) => ({ scope: 'account', analysis: { ...store.accountAnalyses()[0],
      dataCheckReviews: years.map(reportYear => ({ checksVersion: ANALYSIS_DATA_CHECKS_VERSION, reportYear,
        inputFingerprint: analysisReviewContent(inputs, reportYear), reviewedAt: '2026-01-01T00:00:00Z' })) } }));
    TestBed.configureTestingModule({ providers: [BetterPlantsReportService,
      { provide: AnalysisReportCalculationService, useValue: { execute, fingerprint: async (content: string) => content } },
      { provide: AnalysisReviewCommandHandler, useValue: { confirm } },
      { provide: WorkspaceCommandBoundary, useValue: new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService) },
      { provide: AccountReportAutosaveService, useValue: { state: signal('idle') } },
      { provide: AccountReportWorkbenchContext, useValue: { workspace: store, stage,
        key: computed(() => store.accountReports()[0]?.guid ?? ''), report: computed(() => store.accountReports()[0]),
        status: { state: signal('ready') }, findings,
        navigation: { accountReportWorkbenchRoute: (_account, _report, tab) => [tab] }, dashboardRoute: () => ['dashboard'] } }
    ] });
    service = TestBed.inject(BetterPlantsReportService);
  });
  afterEach(() => TestBed.resetTestingModule());
  async function settle() { TestBed.tick(); await TestBed.inject(ApplicationRef).whenStable(); TestBed.tick(); }
  function setReportPeriod(year: number, includeAllYears: boolean) {
    const report = store.accountReports()[0];
    const updated = { ...report, reportYear: year, betterPlantsReportSetup: { ...report.betterPlantsReportSetup, includeAllYears } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [updated] }] });
  }
  function saveReview(year: number) {
    const inputs = buildAnalysisReportInputs(store.snapshot()!, 'account-analysis');
    const analysis = { ...store.accountAnalyses()[0], dataCheckReviews: [{ checksVersion: ANALYSIS_DATA_CHECKS_VERSION,
      reportYear: year, inputFingerprint: analysisReviewContent(inputs, year), reviewedAt: '2026-01-01T00:00:00Z' }] };
    store.publishCommittedPatch({ collections: [{ collection: 'accountAnalyses', upsert: [analysis] }] });
  }
  it('immediately suppresses cached reports and acknowledgment after predictor GUID references change', async () => {
    store.publish(regressionAnalysisReportFixture());
    saveReview(2023); stage.set('report'); await settle();
    const before = service.state().value?.summaries?.[0].adjustedBaselinePrimaryEnergy;
    expect(before).toBeDefined(); expect(service.workflow().completed).toBe(true);
    const updated = structuredClone(store.facilityAnalyses()[0]);
    const [first, second] = updated.groups[0].predictorVariables;
    [first.id, second.id] = [second.id, first.id];
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [updated] }] });
    expect(service.state().value?.summaries).toBeUndefined();
    expect(service.workflow().completed).toBe(false);
    await settle();
    expect(service.state().state).toBe('review-required');
    expect(execute.mock.calls.filter(([request]) => request.operation === 'checks')).toHaveLength(1);
    stage.set('data-checks'); await settle(); await service.confirmReview(); await settle();
    stage.set('report'); await settle();
    expect(service.state().value?.summaries?.[0].adjustedBaselinePrimaryEnergy).not.toBe(before);
    expect(service.workflow().completed).toBe(true);
  });
  it.each(['energy', 'water'] as const)('checks only the selected year while still generating all included %s years', async category => {
    store.publish(analysisReportFixture(category)); setReportPeriod(2024, true);
    await settle(); expect(execute).not.toHaveBeenCalled();
    stage.set('data-checks'); await settle();
    expect(service.state().value?.checks?.map(check => check.reportYear)).toEqual([2024]);
    expect(execute.mock.calls.map(([request]) => [request.operation, request.years])).toEqual([['checks', [2024]]]);
    stage.set('report'); await settle();
    expect(service.state().value?.summaries?.map(summary => summary.reportYear)).toEqual([2024, 2023]);
    expect(execute.mock.calls.map(([request]) => [request.operation, request.years])).toEqual([
      ['checks', [2024]], ['better-plants', [2024, 2023]]
    ]);
    expect(store.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
  });
  it('saves acknowledgment for the selected year only, then permits every requested report page', async () => {
    setReportPeriod(2024, true); findings.set([{ severity: 'warning' }]);
    stage.set('report'); await settle(); expect(service.state().state).toBe('review-required');
    stage.set('data-checks'); await settle(); await service.confirmReview(); await settle();
    expect(store.accountAnalyses()[0].dataCheckReviews?.map(review => review.reportYear)).toEqual([2024]);
    expect(TestBed.inject(AnalysisReviewCommandHandler).confirm).toHaveBeenCalledWith('account', 'account-analysis', expect.anything(), [2024]);
    stage.set('report'); await settle();
    expect(service.state().value?.summaries?.map(summary => summary.reportYear)).toEqual([2024, 2023]);
  });
  it('reuses a current selected-year receipt for direct all-year Report entry without checking historical periods', async () => {
    setReportPeriod(2024, true); findings.set([{ severity: 'warning' }]);
    saveReview(2024);
    stage.set('report'); await settle();
    expect(service.workflow().completed).toBe(true);
    expect(execute.mock.calls.map(([request]) => [request.operation, request.years])).toEqual([['better-plants', [2024, 2023]]]);
  });
  it('does not accept a historical-year receipt in place of the selected report year', async () => {
    setReportPeriod(2024, true); findings.set([{ severity: 'warning' }]);
    saveReview(2023);
    stage.set('report'); await settle();
    expect(service.state().state).toBe('review-required');
    expect(execute.mock.calls.map(([request]) => [request.operation, request.years])).toEqual([['checks', [2024]]]);
  });
  it('updates displayed years immediately without rerunning current-year checks when include-all-years changes', async () => {
    setReportPeriod(2024, true); stage.set('report'); await settle();
    expect(service.state().value?.summaries).toHaveLength(2);
    setReportPeriod(2024, false);
    expect(service.state().value?.summaries).toBeUndefined(); expect(service.workflow().completed).toBe(true);
    await settle(); expect(service.state().value?.summaries?.map(summary => summary.reportYear)).toEqual([2024]);
    setReportPeriod(2024, true);
    expect(service.state().value?.summaries).toBeUndefined();
    await settle(); expect(service.state().value?.summaries).toHaveLength(2);
    expect(execute.mock.calls.filter(([request]) => request.operation === 'checks')).toHaveLength(1);
  });
  it('invalidates current completion and requests the new year when the selected report year changes', async () => {
    setReportPeriod(2024, true); stage.set('report'); await settle();
    setReportPeriod(2023, true);
    expect(service.workflow().completed).toBe(false); expect(service.state().value?.summaries).toBeUndefined();
    await settle();
    expect(service.state().value?.summaries?.map(summary => summary.reportYear)).toEqual([2023]);
    expect(execute.mock.calls.filter(([request]) => request.operation === 'checks').map(([request]) => request.years)).toEqual([[2024], [2023]]);
  });
  it('cancels report work and suppresses late pages when output years change while checks remain current', async () => {
    setReportPeriod(2024, true);
    const pending = new Subject<AnalysisReportWorkerResponse>();
    execute.mockImplementation(request => request.operation === 'better-plants' && request.years.length === 2 ? pending : calculate(request));
    stage.set('report'); await settle(); expect(pending.observed).toBe(true);
    setReportPeriod(2024, false); expect(service.state().value?.summaries).toBeUndefined();
    await settle(); expect(pending.observed).toBe(false); expect(service.state().value?.summaries).toHaveLength(1);
    pending.next({ ok: true, operation: 'better-plants', value: [] });
    expect(service.state().value?.summaries).toHaveLength(1);
  });
  it('does no calculation in Setup and automatically allows a clean report without saving a review', async () => {
    await settle(); expect(execute).not.toHaveBeenCalled();
    stage.set('report'); await settle();
    expect(service.state().value?.summaries).toHaveLength(1);
    expect(service.workflow().completed).toBe(true);
    expect(store.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
    expect(execute.mock.calls.map(([request]) => request.operation)).toEqual(['checks', 'better-plants']);
    stage.set('data-checks'); await settle(); expect(service.canConfirm()).toBe(false);
  });
  it('requires explicit acknowledgment of warnings before generating the report', async () => {
    findings.set([{ severity: 'warning' }]);
    stage.set('report'); await settle(); expect(service.state().state).toBe('review-required');
    expect(execute.mock.calls.map(([request]) => request.operation)).toEqual(['checks']);
    stage.set('data-checks'); await settle(); expect(service.canConfirm()).toBe(true);
    await service.confirmReview(); await settle(); expect(service.state().value?.reviewed).toBe(true);
    stage.set('report'); await settle(); expect(service.state().value?.summaries).toHaveLength(1);
    expect(execute.mock.calls.map(([request]) => request.operation)).toEqual(['checks', 'better-plants']);
  });
  it('shares confirmation across reports and invalidates immediately after dependent data changes', async () => {
    findings.set([{ severity: 'warning' }]);
    stage.set('data-checks'); await settle(); await service.confirmReview(); await settle();
    const original = store.accountReports()[0];
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [{ ...original, guid: 'second-report', id: 60 }] }] });
    // Display the copied report using the same linked analysis.
    const snapshot = store.snapshot()!; store.publish({ ...snapshot, accountReports: [snapshot.accountReports[1]] });
    stage.set('report'); await settle(); expect(service.state().value?.summaries).toHaveLength(1);
    const changed = { ...store.meterData()[0], totalEnergyUse: 12 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changed] }] });
    expect(service.state().value?.summaries).toBeUndefined();
    await settle(); expect(service.state().state).toBe('review-required');
  });
  it('reprojects name and note edits without regenerating report calculations', async () => {
    findings.set([{ severity: 'warning' }]);
    stage.set('data-checks'); await settle(); await service.confirmReview(); await settle(); stage.set('report'); await settle();
    const count = execute.mock.calls.length;
    const report = { ...store.accountReports()[0], name: 'Renamed', betterPlantsReportSetup: { ...store.accountReports()[0].betterPlantsReportSetup, modificationNotes: 'New notes' } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); await settle();
    expect(service.state().state).toBe('ready'); expect(execute).toHaveBeenCalledTimes(count);
  });
  it('refreshes additional water use immediately without repeating unchanged analysis checks', async () => {
    const snapshot = analysisReportFixture('water');
    const group = getNewAnalysisGroup('additional-group', []); group.analysisType = 'skipAnalysis';
    snapshot.facilityAnalyses[0].groups.push(group);
    const meter = { ...snapshot.meters[0], id: 99, guid: 'additional-water', groupId: group.idbGroupId };
    const readings = snapshot.meterData.map((reading, index) => ({ ...reading, id: 100 + index, guid: `extra-${index}`,
      meterId: meter.guid, totalVolume: 10, totalEnergyUse: 10 }));
    store.publish({ ...snapshot, meters: [...snapshot.meters, meter], meterData: [...snapshot.meterData, ...readings] });
    stage.set('report'); await settle();
    expect(service.state().value?.summaries?.[0].reportYearWaterResults.additionalWaterUtility.use).toBe(120);
    const changed = store.meterData().filter(reading => reading.meterId === meter.guid && reading.year === 2023)
      .map(reading => ({ ...reading, totalVolume: 20, totalEnergyUse: 20 }));
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: changed }] });
    expect(service.state().value?.summaries).toBeUndefined(); expect(service.workflow().completed).toBe(true);
    await settle();
    expect(service.state().value?.summaries?.[0].reportYearWaterResults.additionalWaterUtility.use).toBe(240);
    expect(execute.mock.calls.filter(([request]) => request.operation === 'checks')).toHaveLength(1);
  });
  it('refreshes manufacturing counts when facility classification changes and retains its current review', async () => {
    const snapshot = analysisReportFixture('water');
    store.publish({ ...snapshot, facilities: [{ ...snapshot.facilities[0], classification: 'Manufacturing' }] });
    findings.set([{ severity: 'warning' }]); saveReview(2023);
    stage.set('report'); await settle();
    expect(service.state().value?.summaries?.[0].reportYearWaterResults.numberOfManufacturingFacilities).toBe(1);
    const facility = { ...store.facilities()[0], classification: 'Commercial' as const };
    store.publishCommittedPatch({ collections: [{ collection: 'facilities', upsert: [facility] }] });
    expect(service.state().value?.summaries).toBeUndefined(); expect(service.workflow().completed).toBe(true);
    await settle();
    expect(service.state().value?.summaries?.[0].reportYearWaterResults.numberOfManufacturingFacilities).toBe(0);
    expect(execute.mock.calls.map(([request]) => request.operation)).toEqual(['better-plants', 'better-plants']);
    expect(store.accountAnalyses()[0].dataCheckReviews).toHaveLength(1);
  });
  it('cancels obsolete work, drops late results, and exposes a retryable failure', async () => {
    const first = new Subject(); execute.mockReturnValueOnce(first);
    stage.set('data-checks'); await settle(); expect(first.observed).toBe(true);
    const changed = { ...store.meterData()[0], totalEnergyUse: 12 };
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [changed] }] }); await settle();
    expect(first.observed).toBe(false); expect(service.state().state).toBe('ready');
    execute.mockReturnValueOnce(throwError(() => new Error('Worker failed'))); service.retry(); await settle();
    expect(service.state()).toMatchObject({ state: 'error', message: 'Worker failed' });
    service.retry(); await settle(); expect(service.state().state).toBe('ready');
  });
  it('does not permit confirmation for a blocking model', async () => {
    const analysis = structuredClone(store.facilityAnalyses()[0]); analysis.groups[0].analysisType = 'regression';
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [analysis] }] });
    stage.set('data-checks'); await settle(); expect(service.canConfirm()).toBe(false);
    await service.confirmReview(); expect(store.accountAnalyses()[0].dataCheckReviews).toBeUndefined();
  });
});
