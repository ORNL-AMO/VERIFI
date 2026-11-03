import { Injector } from '@angular/core';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbAccessService } from '@data/indexedDB/indexed-db-access.service';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '@data/indexedDB/facility-reports-db.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { FacilityReportActionsService } from '../facility-report-actions.service';

describe('facility analysis report setup transactions', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });
  async function setup() {
    const original = analysisReportFixture(), report = { ...getNewIdbFacilityReport('facility', 'account', 'analysis', []), id: 80, guid: 'facility-report' };
    const snapshot = { ...original, accountAnalyses: [], facilityReports: [report] };
    harness = await IndexedDbTestHarness.create('facility-analysis-report-setup');
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), facilityReports: snapshot.facilityReports });
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    const access = new IndexedDbAccessService(harness.dbService);
    const handler = new ReportCommandHandler(new FacilityReportsDbService(harness.dbService, access), new AccountReportDbService(harness.dbService, access), store, transactions);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [FacilityReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler }] });
    return { snapshot, store, transactions, handler, boundary, actions: injector.get(FacilityReportActionsService) };
  }
  it('merges nested settings into the latest record, preserves selections, and reopens copied reports', async () => {
    const { snapshot, store, transactions, actions, boundary } = await setup();
    const report = snapshot.facilityReports[0];
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', { ...report,
      analysisReportSettings: { ...report.analysisReportSettings, groupReports: false,
        analysisTableColumns: { ...report.analysisReportSettings.analysisTableColumns, bankedSavings: true } } }));
    const committed = vi.fn(), subscription = boundary.committedChange$.subscribe(committed);
    const saved = await actions.updateSetup('facility', 'facility-report', { name: ' Facility results ', analysisItemId: 'facility-analysis',
      analysisReportSettings: { reportYear: 2022, analysisTableColumns: { savings: true } } });
    expect(saved.name).toBe('Facility results'); expect(saved.analysisReportSettings.groupReports).toBe(false);
    expect(saved.analysisReportSettings.analysisTableColumns).toMatchObject({ savings: true, bankedSavings: true });
    expect(store.accountAnalyses()).toEqual([]); expect(store.account()).toEqual(snapshot.account); expect(store.facilities()).toEqual(snapshot.facilities);
    expect(committed).toHaveBeenCalledOnce(); subscription.unsubscribe();
    const copy = await actions.copy('facility', saved.guid); await harness.reopen();
    expect((await harness.getAll('facilityReports')).find(item => item.guid === copy.guid)).toMatchObject({ analysisItemId: 'facility-analysis', analysisReportSettings: saved.analysisReportSettings });
    expect(await harness.getAll('accountAnalysisItems')).toEqual([]);
  });
  it('rolls back failed writes, rejects foreign selections, and preserves missing references on partial edits', async () => {
    const { actions, store, transactions, snapshot } = await setup();
    await expect(actions.updateSetup('facility', 'facility-report', { name: 'Wrong', analysisItemId: 'foreign' })).rejects.toThrow('available analysis');
    expect((await harness.getAll('facilityReports'))[0]['name']).toBe('New Report');
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(actions.updateSetup('facility', 'facility-report', { analysisReportSettings: { reportYear: 2023 } })).rejects.toThrow();
    expect(store.revision()).toBe(0); expect(store.hasPending()).toBe(false);
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', { ...snapshot.facilityReports[0], analysisItemId: 'deleted-analysis' }));
    const saved = await actions.updateSetup('facility', 'facility-report', { analysisReportSettings: { groupReports: false } });
    expect(saved.analysisItemId).toBe('deleted-analysis');
    expect((await actions.updateSetup('facility', 'facility-report', { analysisItemId: null })).analysisItemId).toBeUndefined();
  });
});
