import { of } from 'rxjs';
import { vi } from 'vitest';
import { ReportCommandHandler } from './report-command-handler.service';
import { IdbFacilityReport } from '../../models/idbModels/facilityReport';
import { IdbAccountReport } from '../../models/idbModels/accountReport';

const ACCOUNT = 'acct-1';

describe('ReportCommandHandler', () => {
  function createHandler(accountReports: any[] = []) {
    const facilityReportDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountReportDb = {
      addWithObservable: vi.fn(), updateWithObservable: vi.fn().mockImplementation(r => of(r)),
      deleteWithObservable: vi.fn()
    };
    const accountWorkspaceStore = { accountReports: vi.fn().mockReturnValue(accountReports) };
    const transactions = { runTransaction: vi.fn() };
    const handler = new ReportCommandHandler(
      facilityReportDb as any, accountReportDb as any,
      accountWorkspaceStore as any, transactions as any
    );
    return { handler, facilityReportDb, accountReportDb, accountWorkspaceStore, transactions };
  }

  it('addFacilityReport persists and returns the new report', async () => {
    const { handler, facilityReportDb } = createHandler();
    facilityReportDb.addWithObservable.mockReturnValue(of({ guid: 'fr-1', id: 1 }));
    const result = await handler.addFacilityReport({ guid: 'fr-1', accountId: ACCOUNT } as IdbFacilityReport, ACCOUNT);
    expect(result.id).toBe(1);
  });

  it('updateFacilityReport rejects cross-account report', async () => {
    const { handler, facilityReportDb } = createHandler();
    await expect(
      handler.updateFacilityReport({ guid: 'fr-1', accountId: 'other' } as IdbFacilityReport, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(facilityReportDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('deleteFacilityReport returns the id and rejects cross-account', async () => {
    const { handler, facilityReportDb } = createHandler();
    facilityReportDb.deleteWithObservable.mockReturnValue(of(undefined));
    const result = await handler.deleteFacilityReport({ id: 5, guid: 'fr-1', accountId: ACCOUNT } as IdbFacilityReport, ACCOUNT);
    expect(result).toBe(5);

    await expect(
      handler.deleteFacilityReport({ id: 5, guid: 'fr-1', accountId: 'other' } as IdbFacilityReport, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
  });

  it('addAccountReport persists and returns the new report', async () => {
    const { handler, accountReportDb } = createHandler();
    accountReportDb.addWithObservable.mockReturnValue(of({ guid: 'ar-1', id: 2 }));
    const result = await handler.addAccountReport({ guid: 'ar-1', accountId: ACCOUNT } as IdbAccountReport, ACCOUNT);
    expect(result.id).toBe(2);
  });

  it('bulkDeleteFacilityReports deletes every selected report in one transaction', async () => {
    const { handler, transactions } = createHandler();
    transactions.runTransaction.mockImplementation(async (_stores: unknown, _mode: unknown, operation: (context: { deleteByKey: (store: string, id: number) => Promise<void> }) => Promise<number>) => {
      const deleted: Array<{ store: string, id: number }> = [];
      const count = await operation({
        deleteByKey: async (store: string, id: number) => { deleted.push({ store, id }); }
      });
      expect(deleted).toEqual([{ store: 'facilityReports', id: 7 }, { store: 'facilityReports', id: 8 }]);
      return count;
    });

    const result = await handler.bulkDeleteFacilityReports([
      { id: 7, guid: 'fr-1', accountId: ACCOUNT } as IdbFacilityReport,
      { id: 8, guid: 'fr-2', accountId: ACCOUNT } as IdbFacilityReport
    ], ACCOUNT);

    expect(result).toBe(2);
  });

  it('deleteAccountReport rejects cross-account report', async () => {
    const { handler, accountReportDb } = createHandler();
    await expect(
      handler.deleteAccountReport({ id: 6, guid: 'ar-1', accountId: 'other' } as IdbAccountReport, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(accountReportDb.deleteWithObservable).not.toHaveBeenCalled();
  });

  describe('updateReportsRemoveGroup', () => {
    it('filters the group from betterClimate and dataOverview reports', async () => {
      const bcReport: any = {
        reportType: 'betterClimate',
        betterClimateReportSetup: {
          includedFacilityGroups: [{ groups: [{ groupId: 'g-1' }, { groupId: 'g-other' }] }]
        },
        dataOverviewReportSetup: { includedFacilities: [] }
      };
      const doReport: any = {
        reportType: 'dataOverview',
        betterClimateReportSetup: null,
        dataOverviewReportSetup: {
          includedFacilities: [{ includedGroups: [{ groupId: 'g-1' }, { groupId: 'g-other' }] }]
        }
      };
      const { handler, accountReportDb } = createHandler([bcReport, doReport]);

      await handler.updateReportsRemoveGroup('g-1');

      expect(accountReportDb.updateWithObservable).toHaveBeenCalledTimes(2);
      const bcPersisted = accountReportDb.updateWithObservable.mock.calls[0][0];
      expect(bcPersisted.betterClimateReportSetup.includedFacilityGroups[0].groups).toHaveLength(1);
      expect(bcPersisted.betterClimateReportSetup.includedFacilityGroups[0].groups[0].groupId).toBe('g-other');
      const doPersisted = accountReportDb.updateWithObservable.mock.calls[1][0];
      expect(doPersisted.dataOverviewReportSetup.includedFacilities[0].includedGroups).toHaveLength(1);
    });

    it('does not write reports that do not reference the group', async () => {
      const unaffectedReport: any = {
        reportType: 'betterClimate',
        betterClimateReportSetup: {
          includedFacilityGroups: [{ groups: [{ groupId: 'g-other' }] }]
        },
        dataOverviewReportSetup: { includedFacilities: [] }
      };
      const { handler, accountReportDb } = createHandler([unaffectedReport]);

      await handler.updateReportsRemoveGroup('g-1');

      expect(accountReportDb.updateWithObservable).not.toHaveBeenCalled();
    });

    it('does not mutate original store report objects', async () => {
      const report: any = {
        reportType: 'betterClimate',
        betterClimateReportSetup: {
          includedFacilityGroups: [{ groups: [{ groupId: 'g-1' }] }]
        },
        dataOverviewReportSetup: { includedFacilities: [] }
      };
      const originalGroups = report.betterClimateReportSetup.includedFacilityGroups[0].groups;
      const { handler } = createHandler([report]);

      await handler.updateReportsRemoveGroup('g-1');

      expect(report.betterClimateReportSetup.includedFacilityGroups[0].groups).toBe(originalGroups);
    });
  });

  describe('updateReportsRemoveFacility', () => {
    it('filters the facility from dataOverview and betterClimate reports', async () => {
      const report: any = {
        reportType: 'dataOverview',
        betterClimateReportSetup: { includedFacilityGroups: [{ facilityId: 'fac-1' }, { facilityId: 'fac-other' }] },
        dataOverviewReportSetup: {
          includedFacilities: [{ facilityId: 'fac-1' }, { facilityId: 'fac-other' }]
        }
      };
      const { handler, accountReportDb } = createHandler([report]);

      await handler.updateReportsRemoveFacility('fac-1');

      expect(accountReportDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = accountReportDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.dataOverviewReportSetup.includedFacilities).toHaveLength(1);
      expect(persisted.dataOverviewReportSetup.includedFacilities[0].facilityId).toBe('fac-other');
      expect(persisted.betterClimateReportSetup.includedFacilityGroups).toHaveLength(1);
      expect(persisted.betterClimateReportSetup.includedFacilityGroups[0].facilityId).toBe('fac-other');
    });

    it('does not write reports where the facility is not referenced', async () => {
      const report: any = {
        reportType: 'dataOverview',
        betterClimateReportSetup: { includedFacilityGroups: [{ facilityId: 'fac-other' }] },
        dataOverviewReportSetup: { includedFacilities: [{ facilityId: 'fac-other' }] }
      };
      const { handler, accountReportDb } = createHandler([report]);

      await handler.updateReportsRemoveFacility('fac-1');

      expect(accountReportDb.updateWithObservable).not.toHaveBeenCalled();
    });
  });
});
