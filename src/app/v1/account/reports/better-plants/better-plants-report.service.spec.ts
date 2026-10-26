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
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { AnalysisReportCalculationService } from '@app/v1/shared/reports/analysis-report-calculation.service';
import { AccountReportWorkbenchContext } from '../account-report-workbench/account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-workbench/account-report-autosave.service';
import { BetterPlantsReportService } from './better-plants-report.service';


describe('Better Plants workflow coordinator', () => {
  let store: AccountWorkspaceStore;
  const findings = signal<{ severity: string }[]>([]);
  const stage = signal<'setup' | 'data-checks' | 'report'>('setup');
  let service: BetterPlantsReportService;
  let execute: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    findings.set([]); stage.set('setup'); store = new AccountWorkspaceStore(); store.publish(analysisReportFixture());
    execute = vi.fn(request => of(request.operation === 'checks'
      ? { ok: true, operation: 'checks', value: request.years.map(year => calculateAnalysisDataChecks(request.inputs, year)) }
      : { ok: true, operation: 'better-plants', value: calculateBetterPlantsReport(request.inputs, request.years) }));
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
