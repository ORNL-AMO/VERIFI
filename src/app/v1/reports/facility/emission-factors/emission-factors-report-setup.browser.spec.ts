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
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
import { emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { FacilityReportActionsService } from '../facility-report-actions.service';

describe('Emission Factors setup transactions', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });
  async function setup() {
    const source = emissionFactorsSnapshot();
    const group = { ...getNewIdbUtilityMeterGroup('Energy', 'Energy', 'facility', 'account'), guid: source.meters[0].groupId };
    const snapshot = { ...source, facilityAnalyses: [], accountAnalyses: [], meterGroups: [group] };
    harness = await IndexedDbTestHarness.create('emission-factors-setup');
    await harness.seed({ accounts: [snapshot.account], facilities: snapshot.facilities, facilityReports: snapshot.facilityReports,
      utilityMeter: snapshot.meters.map(item => ({ ...item })), utilityMeterGroups: snapshot.meterGroups });
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    const access = new IndexedDbAccessService(harness.dbService);
    const handler = new ReportCommandHandler(new FacilityReportsDbService(harness.dbService, access), new AccountReportDbService(harness.dbService, access), store, transactions);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [FacilityReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler }] });
    return { snapshot, store, transactions, handler, boundary, actions: injector.get(FacilityReportActionsService) };
  }
  it('merges latest durable years, publishes once, preserves unrelated settings, and reopens copies', async () => {
    const { snapshot, transactions, boundary, store, actions } = await setup();
    const report = snapshot.facilityReports[0];
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', { ...report,
      emissionFactorsReportSettings: { startYear: 2021, endYear: 2024, futureOption: 'keep' } }));
    const committed = vi.fn(), subscription = boundary.committedChange$.subscribe(committed);
    const saved = await actions.updateSetup('facility', 'report-a', { name: ' Updated factors ', emissionFactorsReportSettings: { endYear: 2023 } });
    expect(saved.name).toBe('Updated factors');
    expect(saved.emissionFactorsReportSettings).toEqual({ startYear: 2021, endYear: 2023, futureOption: 'keep' });
    expect(saved.analysisReportSettings).toEqual(report.analysisReportSettings); expect(saved.analysisItemId).toBe(report.analysisItemId);
    expect(committed).toHaveBeenCalledOnce(); subscription.unsubscribe();
    const copy = await actions.copy('facility', 'report-a'); await harness.reopen();
    expect((await harness.getAll('facilityReports')).find(item => item.guid === copy.guid)?.['emissionFactorsReportSettings']).toEqual(saved.emissionFactorsReportSettings);
    await actions.delete('facility', 'report-a');
    expect(store.facilityReports().map(item => item.guid)).toEqual([copy.guid]);
  });
  it('saves cleared and reversed drafts, rejects wrong report types/ownership, and rolls back failed writes', async () => {
    const { actions, store, handler, transactions, snapshot } = await setup();
    const draft = await actions.updateSetup('facility', 'report-a', { emissionFactorsReportSettings: { startYear: null } });
    expect(draft.emissionFactorsReportSettings.startYear).toBeUndefined();
    expect((await actions.updateSetup('facility', 'report-a', { emissionFactorsReportSettings: { startYear: 2025 } })).emissionFactorsReportSettings.startYear).toBe(2025);
    const revision = store.revision();
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(actions.updateSetup('facility', 'report-a', { name: 'Rejected', emissionFactorsReportSettings: { endYear: 2026 } })).rejects.toThrow();
    expect(store.revision()).toBe(revision); expect(store.hasPending()).toBe(false);
    expect((await harness.getAll('facilityReports'))[0]['name']).toBe(snapshot.facilityReports[0].name);
    await expect(handler.updateFacilityReportSetup('elsewhere', 'report-a', { name: 'Wrong' }, 'account')).rejects.toMatchObject({ code: 'validation-failed' });
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', { ...snapshot.facilityReports[0], facilityReportType: 'overview' }));
    await expect(handler.updateFacilityReportSetup('facility', 'report-a', { emissionFactorsReportSettings: { endYear: 2026 } }, 'account')).rejects.toThrow('belong');
    await transactions.runTransaction(['accounts', 'facilityReports'], 'readwrite', async tx => {
      await tx.put('accounts', { ...snapshot.account, displayEmissions: false }); await tx.put('facilityReports', snapshot.facilityReports[0]);
    });
    await expect(handler.updateFacilityReportSetup('facility', 'report-a', { name: 'Wrong' }, 'account')).rejects.toThrow('Other Impacts');
  });
  it.each(['account', 'facility'] as const)('preserves existing year settings through %s backup import and reopen', async scope => {
    const { actions, store, transactions } = await setup();
    const saved = await actions.updateSetup('facility', 'report-a', { emissionFactorsReportSettings: { startYear: 2021 } });
    const snapshot = store.snapshot()!, builder = new WorkspaceBackupSnapshotBuilder();
    const backup = scope === 'account' ? builder.buildAccountBackup(snapshot) : builder.buildFacilityBackup(snapshot, 'facility');
    const prepared = new BackupPreparationService().prepare(JSON.parse(JSON.stringify(backup)));
    expect(prepared.facilityReports[0].emissionFactorsReportSettings).toEqual(saved.emissionFactorsReportSettings);
    const importer = new BackupImportCommandService(transactions, { setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn() } as never);
    const owner = scope === 'account' ? await importer.importAccountBackupFile(prepared, 0)
      : (await importer.importFacilityBackupFile(prepared, 'account', 0)).facility;
    await harness.reopen();
    const reports = (await harness.getAll<IdbFacilityReport & Record<string, unknown>>('facilityReports')).filter(report =>
      scope === 'account' ? report.accountId === owner.guid : report.facilityId === owner.guid);
    expect(reports).toHaveLength(1); expect(reports[0].guid).not.toBe(saved.guid);
    expect(reports[0].emissionFactorsReportSettings).toEqual(saved.emissionFactorsReportSettings);
  });
});
