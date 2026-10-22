import { Injector } from '@angular/core';
import { vi } from 'vitest';
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
import { accountReportAnalysisGuid } from '@data/account-workspace/account-report-setup.models';
import { accountReportReferencesAnalysis, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { isSingleFacilityAnalysisPair } from '@data/account-workspace/single-facility-analysis-pairs';
import { AccountReportActionsService } from './account-report-actions.service';
import { accountReportSnapshot } from './testing/account-report-test-fixtures';

describe('account report setup transactions in Chromium', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });
  async function setup(snapshot = accountReportSnapshot()) {
    harness = await IndexedDbTestHarness.create('account-report-setup');
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), accountAnalysisItems: snapshot.accountAnalyses.map(item => ({ ...item })),
      accountReports: snapshot.accountReports.map(item => ({ ...item })) });
    const store = new AccountWorkspaceStore(); store.publish(snapshot, { facility: snapshot.facilities[0] });
    const transactions = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    const access = new IndexedDbAccessService(harness.dbService);
    const repository = new AccountReportDbService(harness.dbService, access);
    const handler = new ReportCommandHandler(new FacilityReportsDbService(harness.dbService, access), repository, store, transactions);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [AccountReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceCommandBoundary, useValue: boundary }, { provide: ReportCommandHandler, useValue: handler }] });
    return { store, transactions, repository, handler, boundary, actions: injector.get(AccountReportActionsService) };
  }
  it.each(['betterPlants', 'performance', 'analysis', 'accountSavings'] as const)('edits only $value setup fields and preserves settings through copying and reopen', async type => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = type; snapshot.accountReports[0].baselineYear = 1990;
    const { actions, transactions, store } = await setup(snapshot);
    // Simulate an unrelated durable update after the workspace snapshot was published.
    await transactions.runTransaction(['accountReports'], 'readwrite', tx => tx.put('accountReports', { ...snapshot.accountReports[0], reportYear: 2030 }));
    const selected = await actions.updateSetup('account-report', { name: ' Revised ', analysis: { scope: 'account', analysisGuid: 'account-analysis' } });
    expect(selected.name).toBe('Revised'); expect(selected.reportYear).toBe(2030);
    expect(selected.baselineYear).toBe(type === 'accountSavings' ? 1990 : 2018);
    expect(accountReportAnalysisGuid(selected)).toBe('account-analysis'); expect(accountReportReferencesAnalysis(selected, 'account-analysis')).toBe(true);
    expect(selected.dataOverviewReportSetup).toEqual(snapshot.accountReports[0].dataOverviewReportSetup);
    const copy = await actions.copy(selected.guid); await harness.reopen();
    const saved = (await harness.getAll('accountReports')).find(item => item.guid === copy.guid) as unknown as IdbAccountReport;
    expect(saved.reportType).toBe(type); expect(saved.reportYear).toBe(2030); expect(accountReportAnalysisGuid(saved)).toBe('account-analysis');
    expect(saved.dataOverviewReportSetup).toEqual(selected.dataOverviewReportSetup); expect(store.selectedFacility()?.guid).toBe('facility-a');
  });
  it('creates a missing hidden pair atomically without changing account or facility active selections', async () => {
    const snapshot = accountReportSnapshot(true); snapshot.accountAnalyses = []; snapshot.accountReports[0].analysisReportSetup.analysisItemId = undefined;
    const { actions, store, boundary } = await setup(snapshot); const commit = vi.fn(); const subscription = boundary.committedChange$.subscribe(commit);
    const selected = await actions.updateSetup('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } });
    expect(commit).toHaveBeenCalledTimes(1); expect(store.revision()).toBe(1);
    const pair = store.accountAnalyses().find(item => item.guid === selected.analysisReportSetup.analysisItemId)!;
    expect(isSingleFacilityAnalysisPair(pair, 'facility-a', 'facility-analysis')).toBe(true); expect(pair.isAnalysisVisited).toBe(false);
    expect(store.account()).toEqual(snapshot.account); expect(store.facilities()).toEqual(snapshot.facilities); expect(store.selectedFacility()?.guid).toBe('facility-a');
    await harness.reopen();
    const savedReports = await harness.getAll('accountReports'); const savedPairs = await harness.getAll('accountAnalysisItems');
    expect(savedReports[0]['analysisReportSetup']).toEqual(selected.analysisReportSetup); expect(savedPairs[0].guid).toBe(pair.guid); subscription.unsubscribe();
  });
  it('refreshes the report’s matching duplicate pair in place and leaves other pairs and references untouched', async () => {
    const snapshot = accountReportSnapshot(true), original = snapshot.accountAnalyses[0];
    snapshot.accountAnalyses = [{ ...original, id: 29, guid: 'older-pair' }, { ...original, name: 'Stale name', baselineYear: 2000 }];
    snapshot.accountReports = [...snapshot.accountReports, { ...snapshot.accountReports[0], id: 41, guid: 'other-report', analysisReportSetup: { ...snapshot.accountReports[0].analysisReportSetup, analysisItemId: 'older-pair' } }];
    const { actions, store } = await setup(snapshot);
    const updated = await actions.updateSetup('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } });
    expect(updated.analysisReportSetup.analysisItemId).toBe('account-analysis');
    expect(store.accountAnalyses().find(item => item.guid === 'account-analysis')).toMatchObject({ id: 30, name: 'Energy analysis', baselineYear: 2018 });
    expect(store.accountAnalyses().find(item => item.guid === 'older-pair')).toEqual(snapshot.accountAnalyses[0]);
    expect(store.accountReports()[1]).toEqual(snapshot.accountReports[1]);
    await actions.updateSetup('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } });
    expect((await harness.getAll('accountAnalysisItems'))).toHaveLength(2);
  });
  it('reuses an existing pair when no link is saved and rejects stale or foreign selection commands', async () => {
    const snapshot = accountReportSnapshot(true); snapshot.accountReports[0].analysisReportSetup.analysisItemId = undefined;
    const { actions, store } = await setup(snapshot);
    const result = await actions.updateSetup('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } });
    expect(result.analysisReportSetup.analysisItemId).toBe('account-analysis'); expect(store.accountAnalyses()).toHaveLength(1);
    await expect(actions.updateSetup('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-b', analysisGuid: 'facility-analysis' } })).rejects.toThrow();
    await expect(actions.updateSetup('account-report', { analysis: { scope: 'account', analysisGuid: 'account-analysis' } })).rejects.toThrow();
    await expect(actions.updateSetup('account-report', { name: ' ' })).rejects.toThrow();
    expect(store.revision()).toBe(1);
  });
  it('rolls back a newly created pair if the report write fails and publishes nothing', async () => {
    const snapshot = accountReportSnapshot(true); snapshot.accountAnalyses = []; snapshot.accountReports[0].analysisReportSetup.analysisItemId = undefined;
    const { actions, store } = await setup(snapshot);
    const put = IndexedDbTransactionContext.prototype.put;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function(storeName, record) {
      return storeName === 'accountReports' ? Promise.reject(new Error('Report write failed')) : put.call(this, storeName, record);
    });
    await expect(actions.updateSetup('account-report', { analysis: { scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' } })).rejects.toThrow();
    expect(await harness.getAll('accountAnalysisItems')).toEqual([]);
    expect((await harness.getAll('accountReports'))[0]['analysisReportSetup']).toEqual(snapshot.accountReports[0].analysisReportSetup);
    expect(store.revision()).toBe(0); expect(store.hasPending()).toBe(false);
  });
  it('rejects setup commands queued before an account switch without touching durable records', async () => {
    const { actions, store, boundary } = await setup();
    let release!: () => void;
    const first = boundary.execute({ entityKind: 'accountReport', changeKind: 'update', label: 'Pending operation', publication: { mode: 'patch', buildPatch: () => ({}) } },
      () => new Promise<void>(resolve => { release = resolve; }));
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const queued = actions.updateSetup('account-report', { name: 'Stale edit' });
    const firstRejected = expect(first).rejects.toMatchObject({ code: 'stale-workspace' });
    const queuedRejected = expect(queued).rejects.toMatchObject({ code: 'stale-workspace' });
    const other = accountReportSnapshot(); store.publish({ ...other, account: { ...other.account, guid: 'account-b' }, accountReports: [] }); release();
    await firstRejected; await queuedRejected;
    expect((await harness.getAll('accountReports'))[0]['name']).toBe('Saved account report');
  });
  it('preserves a dangling reference on a name-only edit and clears only the active type when requested', async () => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].analysisReportSetup.analysisItemId = 'missing';
    snapshot.accountReports[0].performanceReportSetup.analysisItemId = 'unrelated-saved-reference';
    const { actions } = await setup(snapshot);
    const renamed = await actions.updateSetup('account-report', { name: 'Renamed' });
    expect(renamed.analysisReportSetup.analysisItemId).toBe('missing');
    const cleared = await actions.updateSetup('account-report', { analysis: null });
    expect(cleared.analysisReportSetup.analysisItemId).toBeUndefined(); expect(cleared.performanceReportSetup.analysisItemId).toBe('unrelated-saved-reference');
  });
});
