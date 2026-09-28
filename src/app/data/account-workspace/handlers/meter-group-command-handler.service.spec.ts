import { vi } from 'vitest';
import { MeterGroupCommandHandler } from './meter-group-command-handler.service';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { of } from 'rxjs';

const ACCOUNT = 'acct-1';
const FACILITY = 'fac-1';

describe('MeterGroupCommandHandler', () => {
  function createHandler(
    facilityAnalyses: any[] = [],
    accountReports: any[] = [],
    predictors: any[] = []
  ) {
    const analysisDb = {
      updateWithObservable: vi.fn().mockImplementation(item => of(item)),
    };
    const accountReportDb = {
      updateWithObservable: vi.fn().mockImplementation(report => of(report)),
    };
    const accountWorkspaceStore = {
      facilityAnalyses: vi.fn().mockReturnValue(facilityAnalyses),
      accountReports: vi.fn().mockReturnValue(accountReports),
      predictors: vi.fn().mockReturnValue(predictors),
    };
    const meterHandler = {
      updateMeterGroup: vi.fn().mockResolvedValue(undefined),
      updateMeter: vi.fn().mockResolvedValue(undefined),
    };
    const transaction = {
      add: vi.fn().mockResolvedValue(9),
      put: vi.fn().mockResolvedValue(1),
      deleteByKey: vi.fn().mockResolvedValue(undefined)
    };
    const transactions = {
      runTransaction: vi.fn(async (_stores, _mode, work) => work(transaction))
    };
    const handler = new MeterGroupCommandHandler(
      analysisDb as any, accountReportDb as any,
      accountWorkspaceStore as any, meterHandler as any, transactions as any
    );
    return { handler, analysisDb, accountReportDb, accountWorkspaceStore, meterHandler, transactions, transaction };
  }

  const energyGroup: IdbUtilityMeterGroup = {
    guid: 'g-1', facilityId: FACILITY, groupType: 'Energy'
  } as IdbUtilityMeterGroup;

  describe('addGroup', () => {
    it('adds a new analysis group to matching energy analysis items', async () => {
      const analysisItem = { facilityId: FACILITY, analysisCategory: 'energy', groups: [] };
      const { handler, analysisDb } = createHandler([analysisItem]);

      await handler.addGroup(energyGroup);

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups).toHaveLength(1);
      expect(persisted.groups[0].idbGroupId).toBe('g-1');
      // original store item is not mutated
      expect(analysisItem.groups).toHaveLength(0);
    });

    it('does not add to water analysis items when group is Energy', async () => {
      const waterItem = { facilityId: FACILITY, analysisCategory: 'water', groups: [] };
      const { handler, analysisDb } = createHandler([waterItem]);

      await handler.addGroup(energyGroup);

      expect(waterItem.groups).toHaveLength(0);
      expect(analysisDb.updateWithObservable).not.toHaveBeenCalled();
    });

    it('does not affect analysis items belonging to a different facility', async () => {
      const otherItem = { facilityId: 'other', analysisCategory: 'energy', groups: [] };
      const { handler, analysisDb } = createHandler([otherItem]);

      await handler.addGroup(energyGroup);

      expect(otherItem.groups).toHaveLength(0);
      expect(analysisDb.updateWithObservable).not.toHaveBeenCalled();
    });

    it('adds the group to betterClimate and dataOverview report inclusion lists', async () => {
      const bcReport: any = {
        reportType: 'betterClimate',
        betterClimateReportSetup: {
          includedFacilityGroups: [{ facilityId: FACILITY, groups: [] }]
        },
        dataOverviewReportSetup: { includedFacilities: [] }
      };
      const doReport: any = {
        reportType: 'dataOverview',
        betterClimateReportSetup: { includedFacilityGroups: [] },
        dataOverviewReportSetup: {
          includedFacilities: [{ facilityId: FACILITY, includedGroups: [] }]
        }
      };
      const { handler, accountReportDb } = createHandler([], [bcReport, doReport]);

      await handler.addGroup(energyGroup);

      expect(bcReport.betterClimateReportSetup.includedFacilityGroups[0].groups).toHaveLength(1);
      expect(doReport.dataOverviewReportSetup.includedFacilities[0].includedGroups).toHaveLength(1);
      expect(accountReportDb.updateWithObservable).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteGroup', () => {
    it('removes the group from facility analysis items without mutating the original', async () => {
      const analysisItem = {
        facilityId: FACILITY, analysisCategory: 'energy',
        groups: [{ idbGroupId: 'g-1' }, { idbGroupId: 'g-other' }]
      };
      const { handler, analysisDb } = createHandler([analysisItem]);

      await handler.deleteGroup(energyGroup);

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups).toHaveLength(1);
      expect(persisted.groups[0].idbGroupId).toBe('g-other');
      // original store item is not mutated
      expect(analysisItem.groups).toHaveLength(2);
    });

    it('removes the group from betterClimate and dataOverview reports', async () => {
      const bcReport: any = {
        reportType: 'betterClimate',
        betterClimateReportSetup: {
          includedFacilityGroups: [{ groups: [{ groupId: 'g-1' }, { groupId: 'g-other' }] }]
        },
        dataOverviewReportSetup: { includedFacilities: [] }
      };
      const { handler, accountReportDb } = createHandler([], [bcReport]);

      await handler.deleteGroup(energyGroup);

      expect(bcReport.betterClimateReportSetup.includedFacilityGroups[0].groups).toHaveLength(1);
      expect(accountReportDb.updateWithObservable).toHaveBeenCalledTimes(1);
    });
  });

  describe('changeGroupType', () => {
    it('adds the group to analyses matching the new type without mutating the original', async () => {
      const waterItem = { facilityId: FACILITY, analysisCategory: 'water', groups: [] };
      const waterGroup = { guid: 'g-1', facilityId: FACILITY, groupType: 'Water' } as IdbUtilityMeterGroup;
      const { handler, analysisDb } = createHandler([waterItem]);

      await handler.changeGroupType(waterGroup, 'Energy');

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups).toHaveLength(1);
      expect(waterItem.groups).toHaveLength(0);
    });

    it('removes the group from analyses matching the old type when it no longer matches new', async () => {
      const energyItem = {
        facilityId: FACILITY, analysisCategory: 'energy',
        groups: [{ idbGroupId: 'g-1' }]
      };
      const otherGroup = { guid: 'g-1', facilityId: FACILITY, groupType: 'Other' } as IdbUtilityMeterGroup;
      const { handler, analysisDb } = createHandler([energyItem]);

      await handler.changeGroupType(otherGroup, 'Energy');

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups).toHaveLength(0);
      expect(energyItem.groups).toHaveLength(1);
    });
  });

  describe('saveMeterGroup', () => {
    it('calls changeGroupType, updateMeterGroup, and reassigns meters', async () => {
      const group = { guid: 'g-1', facilityId: FACILITY, groupType: 'Water' } as IdbUtilityMeterGroup;
      const meterToAdd = { guid: 'm-1', accountId: ACCOUNT } as IdbUtilityMeter;
      const meterToRemove = { guid: 'm-2', accountId: ACCOUNT, groupId: 'g-1' } as IdbUtilityMeter;
      const { handler, meterHandler } = createHandler();

      await handler.saveMeterGroup(group, true, 'Energy', [meterToAdd], [meterToRemove], ACCOUNT);

      expect(meterHandler.updateMeterGroup).toHaveBeenCalledWith(group, ACCOUNT);
      expect(meterToAdd.groupId).toBe('g-1');
      expect(meterHandler.updateMeter).toHaveBeenCalledWith(meterToAdd, ACCOUNT);
      expect(meterToRemove.groupId).toBeUndefined();
      expect(meterHandler.updateMeter).toHaveBeenCalledWith(meterToRemove, ACCOUNT);
    });

    it('skips changeGroupType when group type did not change', async () => {
      const group = { guid: 'g-1', facilityId: FACILITY, groupType: 'Energy' } as IdbUtilityMeterGroup;
      const { handler, analysisDb, meterHandler } = createHandler();

      await handler.saveMeterGroup(group, false, 'Energy', [], [], ACCOUNT);

      expect(analysisDb.updateWithObservable).not.toHaveBeenCalled();
      expect(meterHandler.updateMeterGroup).toHaveBeenCalledWith(group, ACCOUNT);
    });
  });

  describe('atomic commands', () => {
    it('creates a group with analysis and report references in one transaction', async () => {
      const analysis = {
        id: 3, guid: 'analysis', accountId: ACCOUNT, facilityId: FACILITY,
        analysisCategory: 'energy', groups: []
      };
      const report = {
        id: 4, guid: 'report', accountId: ACCOUNT, reportType: 'betterClimate',
        betterClimateReportSetup: { includedFacilityGroups: [{ facilityId: FACILITY, groups: [] }] },
        dataOverviewReportSetup: { includedFacilities: [] }
      };
      const { handler, transactions, transaction } = createHandler([analysis], [report]);
      const group = { ...energyGroup, accountId: ACCOUNT };

      const created = await handler.createMeterGroup(group, ACCOUNT);

      expect(created.id).toBe(9);
      expect(transactions.runTransaction).toHaveBeenCalledWith(
        ['utilityMeterGroups', 'analysisItems', 'accountReports'], 'readwrite', expect.any(Function)
      );
      expect(transaction.add).toHaveBeenCalledWith('utilityMeterGroups', group);
      expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 3 }));
      expect(transaction.put).toHaveBeenCalledWith('accountReports', expect.objectContaining({ id: 4 }));
    });

    it('deletes a group and clears related meters in one transaction', async () => {
      const analysis = {
        id: 3, guid: 'analysis', accountId: ACCOUNT, facilityId: FACILITY,
        analysisCategory: 'energy', groups: [{ idbGroupId: 'g-1' }]
      };
      const group = { ...energyGroup, id: 2, accountId: ACCOUNT };
      const assignedMeter = { id: 5, guid: 'meter', accountId: ACCOUNT, groupId: 'g-1' } as IdbUtilityMeter;
      const { handler, transactions, transaction } = createHandler([analysis]);

      await handler.deleteMeterGroupAtomic(group, [assignedMeter], ACCOUNT);

      expect(transactions.runTransaction).toHaveBeenCalledWith(
        ['utilityMeterGroups', 'utilityMeter', 'analysisItems', 'accountReports'],
        'readwrite',
        expect.any(Function)
      );
      expect(transaction.deleteByKey).toHaveBeenCalledWith('utilityMeterGroups', 2);
      expect(transaction.put).toHaveBeenCalledWith('utilityMeter', expect.objectContaining({ id: 5, groupId: undefined }));
    });
  });
});
