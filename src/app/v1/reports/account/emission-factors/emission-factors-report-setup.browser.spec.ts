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
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
import { accountEmissionFactorsSnapshot } from './testing/emission-factors-fixtures';
import { AccountReportActionsService } from '../account-report-actions.service';

describe('Emission Factors setup transactions', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });
  async function setup() {
    const source = accountEmissionFactorsSnapshot();
    const meterGroups = source.facilities.map(facility => ({ ...getNewIdbUtilityMeterGroup('Energy', 'Energy', facility.guid, 'account'), guid: `group-${facility.guid}` }));
    const snapshot = { ...source, facilityAnalyses: [], accountAnalyses: [], facilityReports: [], meterGroups,
      meters: source.meters.map(meter => ({ ...meter, groupId: `group-${meter.facilityId}` })) };
    harness = await IndexedDbTestHarness.create('emission-factors-setup');
    await harness.seed({ accounts: [snapshot.account], facilities: snapshot.facilities, accountReports: snapshot.accountReports,
      utilityMeter: snapshot.meters.map(item => ({ ...item })), utilityMeterGroups: snapshot.meterGroups });
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    const access = new IndexedDbAccessService(harness.dbService);
    const handler = new ReportCommandHandler(new FacilityReportsDbService(harness.dbService, access), new AccountReportDbService(harness.dbService, access), store, transactions);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [AccountReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler }] });
    return { snapshot, store, transactions, handler, boundary, actions: injector.get(AccountReportActionsService) };
  }
  it('merges latest durable years, publishes once, preserves unrelated settings, and reopens copies', async () => {
    const { snapshot, transactions, boundary, store, actions } = await setup();
    const report = snapshot.accountReports[0];
    await transactions.runTransaction(['accountReports'], 'readwrite', tx => tx.put('accountReports', { ...report,
      startYear: 2021, endYear: 2024, futureOption: 'keep' }));
    const committed = vi.fn(), subscription = boundary.committedChange$.subscribe(committed);
    const saved = await actions.updateSetup('account-report', { name: ' Updated factors ', endYear: 2023 });
    expect(saved.name).toBe('Updated factors');
    expect(saved).toMatchObject({ startYear: 2021, endYear: 2023, futureOption: 'keep' });
    expect(saved.analysisReportSetup).toEqual(report.analysisReportSetup); expect(saved.startMonth).toBe(report.startMonth); expect(saved.endMonth).toBe(report.endMonth);
    expect(committed).toHaveBeenCalledOnce(); subscription.unsubscribe();
    const copy = await actions.copy('account-report'); await harness.reopen();
    expect((await harness.getAll('accountReports')).find(item => item.guid === copy.guid)?.['startYear']).toBe(saved.startYear);
    await actions.delete('account-report');
    expect(store.accountReports().map(item => item.guid)).toEqual([copy.guid]);
  });
  it('saves cleared and reversed drafts, rejects wrong report types/ownership, and rolls back failed writes', async () => {
    const { actions, store, handler, transactions, snapshot } = await setup();
    const draft = await actions.updateSetup('account-report', { startYear: null });
    expect(draft.startYear).toBeUndefined();
    expect((await actions.updateSetup('account-report', { startYear: 2025 })).startYear).toBe(2025);
    const revision = store.revision();
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(actions.updateSetup('account-report', { name: 'Rejected', endYear: 2026 })).rejects.toThrow();
    expect(store.revision()).toBe(revision); expect(store.hasPending()).toBe(false);
    expect((await harness.getAll('accountReports'))[0]['name']).toBe(snapshot.accountReports[0].name);
    await expect(handler.updateAccountReportSetup('account-report', { name: 'Wrong' }, 'elsewhere')).rejects.toMatchObject({ code: 'validation-failed' });
    await transactions.runTransaction(['accountReports'], 'readwrite', tx => tx.put('accountReports', { ...snapshot.accountReports[0], reportType: 'dataOverview' }));
    await expect(handler.updateAccountReportSetup('account-report', { endYear: 2026 }, 'account')).rejects.toThrow('belong');
    await transactions.runTransaction(['accounts', 'accountReports'], 'readwrite', async tx => {
      await tx.put('accounts', { ...snapshot.account, displayEmissions: false }); await tx.put('accountReports', snapshot.accountReports[0]);
    });
    await expect(handler.updateAccountReportSetup('account-report', { name: 'Wrong' }, 'account')).rejects.toThrow('Other Impacts');
  });
  it('preserves periods through account backup import and reopen', async () => {
    const { actions, store, transactions } = await setup();
    const saved = await actions.updateSetup('account-report', { startYear: 2021 });
    const backup = new WorkspaceBackupSnapshotBuilder().buildAccountBackup(store.snapshot()!);
    const prepared = new BackupPreparationService().prepare(JSON.parse(JSON.stringify(backup)));
    expect(prepared.accountReports[0]).toMatchObject({ startYear: 2021, endYear: 2024 });
    const importer = new BackupImportCommandService(transactions, { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as never);
    const owner = await importer.importAccountBackupFile(prepared, 0);
    await harness.reopen();
    const reports = (await harness.getAll<IdbAccountReport & Record<string, unknown>>('accountReports')).filter(report => report.accountId === owner.guid);
    expect(reports).toHaveLength(1); expect(reports[0].guid).not.toBe(saved.guid);
    expect(reports[0]).toMatchObject({ startYear: 2021, endYear: 2024 });
  });
  it.each([NaN, Infinity, 2022.5, 1799, 10000, '2022'])('rejects malformed year %s without publishing or persisting', async year => {
    const { actions, store, snapshot } = await setup();
    const revision = store.revision();
    await expect(actions.updateSetup('account-report', { startYear: year as number })).rejects.toThrow('valid emission-factor year');
    expect(store.revision()).toBe(revision);
    expect((await harness.getAll('accountReports'))[0]['startYear']).toBe(snapshot.accountReports[0].startYear);
  });
});
