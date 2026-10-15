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
import { FacilityReportActionsService } from './facility-report-actions.service';
import { reportFacility, reportFixture, reportSnapshot } from './testing/report-test-fixtures';

describe('facility report lifecycle in Chromium IndexedDB', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { await harness?.destroy(); });

  it('creates, copies, deletes, and reopens durable reports without affecting another owner', async () => {
    harness = await IndexedDbTestHarness.create('facility-report-lifecycle');
    const source = reportFixture({ analysisItemId: 'analysis-a', checked: true });
    source.analysisReportSettings.reportYear = 2023;
    source.dataOverviewReportSettings.includedGroups = [{ groupId: 'group-a', include: false }];
    source.costSavingsReportSettings.unitCostTable = { 2023: { 'group-a': 4.2 } };
    const other = reportFixture({ id: 20, guid: 'other-report', accountId: 'account-b', facilityId: 'facility-b' });
    await harness.seed({ ...twoAccountPersistenceSeed, facilityReports: [{ ...source }, { ...other }] });
    const store = new AccountWorkspaceStore();
    store.publish(reportSnapshot([source]), { facility: reportFacility });
    const repository = new FacilityReportsDbService(harness.dbService, new IndexedDbAccessService(harness.dbService));
    const handler = new ReportCommandHandler(repository, {} as AccountReportDbService, store, {} as IndexedDbTransactionService);
    const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
    const injector = Injector.create({ providers: [
      FacilityReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: ReportCommandHandler, useValue: handler }, { provide: WorkspaceCommandBoundary, useValue: boundary }
    ] });
    const service = injector.get(FacilityReportActionsService);
    const committed: string[] = [];
    const subscription = boundary.committedChange$.subscribe(change => committed.push(change.changeKind));
    try {
      const created = await service.create('facility-a', 'New overview', 'overview');
      const copy = await service.copy('facility-a', source.guid);
      expect(copy.id).not.toBe(source.id);
      expect(copy.guid).not.toBe(source.guid);
      expect(copy.checked).toBe(false);
      expect(copy.costSavingsReportSettings).toEqual(source.costSavingsReportSettings);
      await service.delete('facility-a', source.guid);
      expect(store.revision()).toBe(3);
      expect(committed).toEqual(['add', 'add', 'delete']);
      await harness.reopen();
      const reopened = new FacilityReportsDbService(harness.dbService, new IndexedDbAccessService(harness.dbService));
      const saved = await reopened.getStoredByGuid(copy.guid);
      expect(saved?.name).toBe(`${source.name} (Copy)`);
      expect(saved?.analysisItemId).toBe('analysis-a');
      expect(saved?.analysisReportSettings).toEqual(source.analysisReportSettings);
      expect(saved?.dataOverviewReportSettings).toEqual(source.dataOverviewReportSettings);
      expect(await reopened.getStoredByGuid(source.guid)).toBeUndefined();
      expect(await reopened.getStoredByGuid(other.guid)).toEqual(other);
      expect((await reopened.getStoredByGuid(created.guid))?.facilityReportType).toBe('overview');
      expect(await firstValueFrom(harness.dbService.count('analysisItems'))).toBe(twoAccountPersistenceSeed.analysisItems.length);
      store.publish(reportSnapshot([saved!]), { facility: reportFacility, facilityReport: saved });
      expect(store.selectedFacilityReport()?.guid).toBe(copy.guid);
    } finally {
      subscription.unsubscribe();
    }
  });
});
