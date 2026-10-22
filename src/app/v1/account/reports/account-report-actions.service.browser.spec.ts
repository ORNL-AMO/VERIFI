import { Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { FacilityReportsDbService } from '@data/indexedDB/facility-reports-db.service';
import { IndexedDbAccessService } from '@data/indexedDB/indexed-db-access.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { twoAccountPersistenceSeed } from '@data/indexedDB/testing/indexed-db-test-fixtures';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { FacilityReportActionsService } from '@app/v1/facility/reports/facility-report-actions.service';
import { reportAccount, reportFacility, reportFixture, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { AccountReportActionsService } from './account-report-actions.service';

describe('mixed report lifecycle in Chromium IndexedDB', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { await harness?.destroy(); });
  it('preserves account settings, hidden analysis links and facility ownership through copies, renames, deletes and reopen', async () => {
    harness = await IndexedDbTestHarness.create('account-report-lifecycle');
    const source = { ...getNewIdbAccountReport(reportAccount, [reportFacility], []), id: 30, guid: 'account-report', name: 'Saved account', reportType: 'analysis' as const, reportYear: 2024 };
    source.analysisReportSetup.analysisItemId = 'single-site-hidden-analysis';
    source.dataOverviewReportSetup.includedFacilities[0].included = false;
    const other = { ...source, id: 31, guid: 'other-account-report', accountId: 'account-b' };
    const facility = reportFixture({ analysisItemId: 'facility-analysis' });
    await harness.seed({ ...twoAccountPersistenceSeed, accountReports: [source, other], facilityReports: [{ ...facility }] });
    const store = new AccountWorkspaceStore(); store.publish({ ...reportSnapshot([facility]), account: { ...reportAccount, isSingleFacilityCompany: true }, accountReports: [source] });
    const access = new IndexedDbAccessService(harness.dbService);
    const accountRepository = new AccountReportDbService(harness.dbService, access);
    const facilityRepository = new FacilityReportsDbService(harness.dbService, access);
    const handler = new ReportCommandHandler(facilityRepository, accountRepository, store, {} as IndexedDbTransactionService);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [AccountReportActionsService, FacilityReportActionsService,
      { provide: AccountWorkspaceStore, useValue: store }, { provide: ReportCommandHandler, useValue: handler }, { provide: WorkspaceCommandBoundary, useValue: boundary }] });
    const accounts = injector.get(AccountReportActionsService); const facilities = injector.get(FacilityReportActionsService);
    const committed: string[] = []; const subscription = boundary.committedChange$.subscribe(change => committed.push(change.changeKind));
    try {
      const created = await accounts.create('New overview', 'dataOverview');
      const copy = await accounts.copy(source.guid); await accounts.updateName(copy.guid, 'Renamed account copy');
      const facilityCopy = await facilities.copy(reportFacility.guid, facility.guid); await facilities.updateName(reportFacility.guid, facilityCopy.guid, 'Renamed facility copy');
      await accounts.delete(source.guid); await facilities.delete(reportFacility.guid, facility.guid);
      expect(store.selectedFacility()).toBeUndefined(); expect(store.revision()).toBe(7);
      expect(committed).toEqual(['add', 'add', 'update', 'add', 'update', 'delete', 'delete']);
      await harness.reopen();
      const reopenedAccess = new IndexedDbAccessService(harness.dbService);
      const reopenedAccount = new AccountReportDbService(harness.dbService, reopenedAccess);
      const reopenedFacility = new FacilityReportsDbService(harness.dbService, reopenedAccess);
      const saved = await reopenedAccount.getStoredByGuid(copy.guid);
      expect(saved?.name).toBe('Renamed account copy'); expect(saved?.reportYear).toBe(2024);
      expect(saved?.analysisReportSetup).toEqual(source.analysisReportSetup); expect(saved?.dataOverviewReportSetup).toEqual(source.dataOverviewReportSetup);
      expect(await reopenedAccount.getStoredByGuid(source.guid)).toBeUndefined(); expect(await reopenedAccount.getStoredByGuid(other.guid)).toEqual(other);
      expect((await reopenedAccount.getStoredByGuid(created.guid))?.dataOverviewReportSetup.includedFacilities[0].included).toBe(true);
      expect((await reopenedFacility.getStoredByGuid(facilityCopy.guid))?.analysisItemId).toBe('facility-analysis');
      expect((await reopenedFacility.getStoredByGuid(facilityCopy.guid))?.name).toBe('Renamed facility copy');
      expect(await reopenedFacility.getStoredByGuid(facility.guid)).toBeUndefined();
      expect(await firstValueFrom(harness.dbService.count('accountAnalysisItems'))).toBe(twoAccountPersistenceSeed.accountAnalysisItems.length);
    } finally { subscription.unsubscribe(); injector.destroy(); }
  });
});
