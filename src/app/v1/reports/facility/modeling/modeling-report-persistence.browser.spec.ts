import { Injector } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbAccessService } from '@data/indexedDB/indexed-db-access.service';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '@data/indexedDB/facility-reports-db.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
import { FacilityReportActionsService } from '../facility-report-actions.service';
import { modelingSnapshot } from './testing/modeling-report-test-fixtures';

describe('Modeling report IndexedDB compatibility', () => {
  let database: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await database?.destroy(); });
  async function setup() {
    const snapshot = modelingSnapshot(); database = await IndexedDbTestHarness.create('modeling-report-setup');
    await database.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), facilityReports: snapshot.facilityReports });
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: database.databaseName } });
    const access = new IndexedDbAccessService(database.dbService);
    const handler = new ReportCommandHandler(new FacilityReportsDbService(database.dbService, access), new AccountReportDbService(database.dbService, access), store, transactions);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [FacilityReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler }] });
    return { snapshot, store, transactions, actions: injector.get(FacilityReportActionsService), boundary };
  }
  it('merges the latest durable switches, publishes once, and copies/reopens without creating account analyses', async () => {
    const { snapshot, transactions, actions, boundary, store } = await setup();
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', {
      ...snapshot.facilityReports[0], modelingReportSettings: { ...snapshot.facilityReports[0].modelingReportSettings, includeExecutiveSummary: false }
    }));
    const committed = vi.fn(), subscription = boundary.committedChange$.subscribe(committed);
    const saved = await actions.updateSetup('facility', 'modeling-report', { name: ' Diagnostic report ',
      modelingReportSettings: { reportYear: 2022, includeIssuesSummary: false } });
    expect(saved.name).toBe('Diagnostic report'); expect(saved.modelingReportSettings).toMatchObject({ reportYear: 2022, includeIssuesSummary: false, includeExecutiveSummary: false });
    expect(committed).toHaveBeenCalledOnce(); subscription.unsubscribe();
    const copy = await actions.copy('facility', saved.guid); await database.reopen();
    const rows = await database.getAll('facilityReports');
    expect(rows.find(row => row.guid === copy.guid)).toMatchObject({ analysisItemId: 'facility-analysis', modelingReportSettings: saved.modelingReportSettings });
    expect(store.accountAnalyses()).toEqual([]); expect(await database.getAll('accountAnalysisItems')).toEqual([]);
  });
  it('rejects foreign selections and wrong-type settings, rolls back failure, and preserves deleted links on unrelated edits', async () => {
    const { snapshot, actions, transactions, store } = await setup();
    await expect(actions.updateSetup('facility', 'modeling-report', { analysisItemId: 'foreign', name: 'Wrong' })).rejects.toThrow('available analysis');
    await expect(actions.updateSetup('facility', 'modeling-report', { analysisReportSettings: { reportYear: 2024 } })).rejects.toThrow('Analysis report');
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(actions.updateSetup('facility', 'modeling-report', { modelingReportSettings: { reportYear: null } })).rejects.toThrow();
    expect(store.committedRevision()).toBeUndefined(); expect(store.hasPending()).toBe(false);
    expect((await database.getAll('facilityReports'))[0]['name']).toBe(snapshot.facilityReports[0].name);
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', { ...snapshot.facilityReports[0], analysisItemId: 'deleted' }));
    const saved = await actions.updateSetup('facility', 'modeling-report', { modelingReportSettings: { includeDataValidationTables: false } });
    expect(saved.analysisItemId).toBe('deleted');
    expect((await actions.updateSetup('facility', 'modeling-report', { analysisItemId: null })).analysisItemId).toBeUndefined();
  });
  it.each(['account', 'facility'] as const)('preserves modeling settings and remaps the analysis link through %s backup restore', async scope => {
    const { actions, store, transactions } = await setup();
    const saved = await actions.updateSetup('facility', 'modeling-report', { modelingReportSettings: { includeIssuesSummary: false, reportYear: 2022 } });
    const builder = new WorkspaceBackupSnapshotBuilder(), snapshot = store.snapshot()!;
    const backup = scope === 'account' ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility');
    const prepared = new BackupPreparationService().prepare(JSON.parse(JSON.stringify(backup)));
    const importer = new BackupImportCommandService(transactions, { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as never);
    const owner = scope === 'account' ? await importer.importAccountBackupFile(prepared, 0)
      : (await importer.importFacilityBackupFile(prepared, 'account', 0)).facility;
    await database.reopen();
    const restored = (await database.getAll<IdbFacilityReport & Record<string, unknown>>('facilityReports')).find(report =>
      report.guid !== saved.guid && (scope === 'account' ? report.accountId === owner.guid : report.facilityId === owner.guid))!;
    expect(restored.modelingReportSettings).toEqual(saved.modelingReportSettings);
    expect(restored.analysisItemId).not.toBe(saved.analysisItemId);
    const analysis = (await database.getAll('analysisItems')).find(item => item.guid === restored.analysisItemId);
    expect(analysis?.['facilityId']).toBe(restored.facilityId); expect(analysis?.['accountId']).toBe(restored.accountId);
  });
});
