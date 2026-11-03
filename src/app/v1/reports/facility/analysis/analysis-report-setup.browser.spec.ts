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
import { getNewIdbFacilityReport, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
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
      analysisReportSettings: { ...report.analysisReportSettings, groupReports: false, facilityGroupContributionsTable: false,
        analysisTableColumns: { ...report.analysisReportSettings.analysisTableColumns, bankedSavings: true } } }));
    const committed = vi.fn(), subscription = boundary.committedChange$.subscribe(committed);
    const saved = await actions.updateSetup('facility', 'facility-report', { name: ' Facility results ', analysisItemId: 'facility-analysis',
      analysisReportSettings: { reportYear: 2022, facilityGroupContributions: true, facilityGroupContributionsGraphs: false,
        analysisTableColumns: { savings: true } } });
    expect(saved.name).toBe('Facility results'); expect(saved.analysisReportSettings.groupReports).toBe(false);
    expect(saved.analysisReportSettings.analysisTableColumns).toMatchObject({ savings: true, bankedSavings: true });
    expect(saved.analysisReportSettings).toMatchObject({ facilityGroupContributions: true,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false });
    expect(store.accountAnalyses()).toEqual([]); expect(store.account()).toEqual(snapshot.account); expect(store.facilities()).toEqual(snapshot.facilities);
    expect(committed).toHaveBeenCalledOnce(); subscription.unsubscribe();
    const copy = await actions.copy('facility', saved.guid); await harness.reopen();
    expect((await harness.getAll('facilityReports')).find(item => item.guid === copy.guid)).toMatchObject({ analysisItemId: 'facility-analysis', analysisReportSettings: saved.analysisReportSettings });
    expect(await harness.getAll('accountAnalysisItems')).toEqual([]);
  });
  it.each(['account', 'facility'] as const)('preserves contribution settings through a %s backup restore and reopen', async scope => {
    const { actions, store, transactions } = await setup();
    const settings = { facilityGroupContributions: true, facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: true };
    const saved = await actions.updateSetup('facility', 'facility-report', { analysisItemId: 'facility-analysis', analysisReportSettings: settings });
    const copy = await actions.copy('facility', saved.guid);
    await harness.reopen();
    const stored = await harness.getAll<IdbFacilityReport & Record<string, unknown>>('facilityReports');
    expect(stored.find(item => item.guid === saved.guid)?.analysisReportSettings).toMatchObject(settings);
    expect(stored.find(item => item.guid === copy.guid)?.analysisReportSettings).toMatchObject(settings);
    const snapshot = store.snapshot()!;
    const group = { ...getNewIdbUtilityMeterGroup('Energy', 'Energy group', 'facility', 'account'), guid: snapshot.meters[0].groupId };
    const builder = new WorkspaceBackupSnapshotBuilder();
    const backupSnapshot = { ...snapshot, meterGroups: [group] };
    const backup = scope === 'account' ? builder.buildAccountBackup(backupSnapshot) : builder.buildFacilityBackup(backupSnapshot, 'facility');
    const prepared = new BackupPreparationService().prepare(JSON.parse(JSON.stringify(backup)));
    expect(prepared.facilityReports.map(report => report.analysisReportSettings)).toEqual([saved.analysisReportSettings, copy.analysisReportSettings]);
    const importer = new BackupImportCommandService(transactions, { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as never);
    const owner = scope === 'account' ? await importer.importAccountBackupFile(prepared, 0)
      : (await importer.importFacilityBackupFile(prepared, 'account', 0)).facility;
    await harness.reopen();
    const reports = (await harness.getAll<IdbFacilityReport & Record<string, unknown>>('facilityReports')).filter(report =>
      scope === 'account' ? report.accountId === owner.guid : report.facilityId === owner.guid);
    expect(reports).toHaveLength(2);
    for (const report of reports) {
      expect(report.guid).not.toBe(saved.guid); expect(report.guid).not.toBe(copy.guid);
      expect(report.analysisReportSettings).toEqual(saved.analysisReportSettings);
      const analysis = (await harness.getAll('analysisItems')).find(item => item.guid === report.analysisItemId);
      expect(analysis?.['facilityId']).toBe(report.facilityId);
      expect(analysis?.['accountId']).toBe(report.accountId);
    }
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
