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
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { FacilityReportActionsService } from '../facility-report-actions.service';
import { dataQualitySnapshot } from './testing/data-quality-report-test-fixtures';

describe('Data Quality setup transactions', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });
  async function setup() {
    const snapshot = dataQualitySnapshot();
    delete snapshot.facilityReports[0].dataQualityReportSettings.includeAnnualTotalsTable;
    harness = await IndexedDbTestHarness.create('data-quality-report-setup');
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), utilityMeter: snapshot.meters.map(item => ({ ...item })),
      utilityMeterGroups: snapshot.meterGroups.map(item => ({ ...item })),
      predictor: snapshot.predictors.map(item => ({ ...item })), facilityReports: snapshot.facilityReports.map(item => ({ ...item })) });
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    const access = new IndexedDbAccessService(harness.dbService);
    const handler = new ReportCommandHandler(new FacilityReportsDbService(harness.dbService, access), new AccountReportDbService(harness.dbService, access), store, transactions);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [FacilityReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler }] });
    return { snapshot, store, transactions, boundary, actions: injector.get(FacilityReportActionsService) };
  }
  it('merges current durable settings, publishes once, preserves backup fields and copies, and survives reopening', async () => {
    const { snapshot, store, transactions, boundary, actions } = await setup();
    const source = snapshot.facilityReports[0];
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', {
      ...source, dataQualityReportSettings: { ...source.dataQualityReportSettings, includePredictorHistogram: false }
    }));
    const committed = vi.fn(), subscription = boundary.committedChange$.subscribe(committed);
    const saved = await actions.updateSetup('facility-a', 'report-a', { name: ' Quality review ',
      dataQualityReportSettings: { selectedMeterIds: ['meter-b'], includeMeterCostHistogram: true } });
    expect(saved.name).toBe('Quality review');
    expect(saved.dataQualityReportSettings).toMatchObject({ selectedMeterIds: ['meter-b'], selectedPredictorIds: ['predictor-a'],
      includePredictorHistogram: false, includeMeterCostHistogram: true, missingSelection: false });
    expect(saved.dataQualityReportSettings.includeAnnualTotalsTable).toBeUndefined();
    expect(committed).toHaveBeenCalledOnce(); subscription.unsubscribe();
    const backup = new WorkspaceBackupSnapshotBuilder().buildAccountBackup(store.snapshot()!);
    const prepared = new BackupPreparationService().prepare(JSON.parse(JSON.stringify(backup)));
    expect(prepared.facilityReports[0].dataQualityReportSettings).toEqual(saved.dataQualityReportSettings);
    const copy = await actions.copy('facility-a', saved.guid); await harness.reopen();
    const reports = await harness.getAll<IdbFacilityReport & Record<string, unknown>>('facilityReports');
    expect(reports.find(report => report.guid === saved.guid)?.dataQualityReportSettings).toEqual(saved.dataQualityReportSettings);
    expect(reports.find(report => report.guid === copy.guid)?.dataQualityReportSettings).toEqual(saved.dataQualityReportSettings);
  });
  it('synchronizes analysis links, clears them for manual mode, and saves incomplete selections as drafts', async () => {
    const { actions } = await setup();
    const linked = await actions.updateSetup('facility-a', 'report-a', { dataQualityReportSettings: {
      selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a', selectedMeterIds: [], selectedPredictorIds: [] } });
    expect(linked.analysisItemId).toBe('analysis-a'); expect(linked.dataQualityReportSettings.missingSelection).toBe(false);
    const manual = await actions.updateSetup('facility-a', 'report-a', { dataQualityReportSettings: {
      selectedMode: 'manual', selectedAnalysisItemId: null, selectedMeterIds: [], selectedPredictorIds: [] } });
    expect(manual.analysisItemId).toBeUndefined(); expect(manual.dataQualityReportSettings.missingSelection).toBe(true);
  });
  it('recomputes the legacy selection flag only on explicit saves and retains source GUIDs after deletion', async () => {
    const { actions, transactions, snapshot, store } = await setup();
    const source = snapshot.facilityReports[0];
    const stale = { ...source, dataQualityReportSettings: { ...source.dataQualityReportSettings, missingSelection: true } };
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', stale));
    const valid = await actions.updateSetup('facility-a', source.guid, { name: 'Validated selection' });
    expect(valid.dataQualityReportSettings.missingSelection).toBe(false);
    await transactions.runTransaction(['utilityMeter'], 'readwrite', tx => tx.deleteByKey('utilityMeter', snapshot.meters[0].id!));
    const partial = await actions.updateSetup('facility-a', source.guid, { name: 'Remaining predictor' });
    expect(partial.dataQualityReportSettings.missingSelection).toBe(false);
    expect(partial.dataQualityReportSettings.selectedMeterIds).toEqual(['meter-a']);
    await transactions.runTransaction(['predictor'], 'readwrite', tx => tx.deleteByKey('predictor', snapshot.predictors[0].id!));
    const missing = await actions.updateSetup('facility-a', source.guid, { name: 'No remaining sources' });
    expect(missing.dataQualityReportSettings.missingSelection).toBe(true);
    expect(missing.dataQualityReportSettings.selectedMeterIds).toEqual(['meter-a']);
    const copy = await actions.copy('facility-a', source.guid);
    expect(copy.dataQualityReportSettings).toEqual(missing.dataQualityReportSettings);
    await actions.delete('facility-a', source.guid); await harness.reopen();
    const reports = await harness.getAll<IdbFacilityReport & Record<string, unknown>>('facilityReports');
    expect(reports.find(report => report.guid === source.guid)).toBeUndefined();
    expect(reports.find(report => report.guid === copy.guid)?.dataQualityReportSettings).toEqual(missing.dataQualityReportSettings);
    expect(store.facilityReports().map(report => report.guid)).toEqual([copy.guid]);
  });
  it('rejects missing and foreign source GUIDs atomically and retains existing unavailable references on unrelated edits', async () => {
    const { actions, transactions, snapshot, store } = await setup();
    await transactions.runTransaction(['predictor'], 'readwrite', tx => tx.put('predictor', {
      ...snapshot.predictors[1], facilityId: 'foreign-facility'
    }));
    for (const patch of [{ selectedMeterIds: ['missing'] }, { selectedPredictorIds: ['predictor-b'] }, { selectedAnalysisItemId: 'missing' }]) {
      await expect(actions.updateSetup('facility-a', 'report-a', { name: 'Rejected', dataQualityReportSettings: patch })).rejects.toThrow('belonging to this facility');
    }
    expect(store.revision()).toBe(0);
    const report = snapshot.facilityReports[0];
    await transactions.runTransaction(['facilityReports'], 'readwrite', tx => tx.put('facilityReports', {
      ...report, dataQualityReportSettings: { ...report.dataQualityReportSettings, selectedMeterIds: ['deleted'] }
    }));
    const saved = await actions.updateSetup('facility-a', 'report-a', { dataQualityReportSettings: { includePredictorHistogram: false } });
    expect(saved.dataQualityReportSettings.selectedMeterIds).toEqual(['deleted']);
    expect(saved.dataQualityReportSettings.missingSelection).toBe(false);
  });
  it('rolls back failed writes without publication or losing the saved settings', async () => {
    const { actions, store, snapshot } = await setup();
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(actions.updateSetup('facility-a', 'report-a', { dataQualityReportSettings: { includeMeter: false } })).rejects.toThrow();
    expect(store.revision()).toBe(0); expect(store.hasPending()).toBe(false);
    expect((await harness.getAll('facilityReports'))[0]['dataQualityReportSettings']).toEqual(snapshot.facilityReports[0].dataQualityReportSettings);
  });
});
