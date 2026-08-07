import { vi } from 'vitest';
import { MeterGroupCommandHandler } from './meter-group-command-handler.service';
import { IdbUtilityMeterGroup } from '../../models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from '../../models/idbModels/utilityMeter';
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
    const handler = new MeterGroupCommandHandler(
      analysisDb as any, accountReportDb as any,
      accountWorkspaceStore as any, meterHandler as any
    );
    return { handler, analysisDb, accountReportDb, accountWorkspaceStore, meterHandler };
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
});

