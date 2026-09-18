import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { account, facility, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import {
  CANONICAL_ENERGY_UNIT,
  CANONICAL_GAS_UNIT,
  CANONICAL_LIQUID_UNIT,
  CANONICAL_MASS_UNIT,
  buildWorkspaceCalendarizationRequest
} from './workspace-calendarization-request';

describe('v1 canonical workspace calendarization request', () => {
  it('normalizes display units, basis, and fiscal settings into one site-energy request', () => {
    const built = buildWorkspaceCalendarizationRequest(workspaceSnapshot());

    expect(built.payload.accountOrFacility).toEqual(expect.objectContaining({
      energyUnit: CANONICAL_ENERGY_UNIT,
      volumeLiquidUnit: CANONICAL_LIQUID_UNIT,
      volumeGasUnit: CANONICAL_GAS_UNIT,
      massUnit: CANONICAL_MASS_UNIT,
      energyIsSource: false,
      fiscalYear: 'calendarYear',
      fiscalYearMonth: 0
    }));
    expect(built.payload.calanderizationOptions).toEqual({ energyIsSource: false, neededUnits: 'MMBtu' });
    expect(built.payload.meters[0]).not.toHaveProperty('displayEnergyUnit');
    expect(built.payload.meters[0]).not.toHaveProperty('displayEnergyIsSource');
    expect(() => structuredClone(built.payload)).not.toThrow();
  });

  it('keeps the same fingerprint for display-only changes and changes it for allocation inputs', () => {
    const original = workspaceSnapshot();
    const first = buildWorkspaceCalendarizationRequest(original);
    const displayOnly: AccountWorkspaceSnapshot = {
      ...original,
      facilities: [{
        ...original.facilities[0], energyUnit: 'GJ', volumeLiquidUnit: 'L', energyIsSource: true,
        fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6
      }],
      meters: [{ ...original.meters[0], displayEnergyUnit: 'kWh', displayEnergyIsSource: true }]
    };
    const readingChange: AccountWorkspaceSnapshot = {
      ...original,
      meterData: [{ ...original.meterData[0], totalEnergyUse: 200 }]
    };

    expect(buildWorkspaceCalendarizationRequest(displayOnly).inputFingerprint).toBe(first.inputFingerprint);
    expect(buildWorkspaceCalendarizationRequest(readingChange).inputFingerprint).not.toBe(first.inputFingerprint);
  });

  it('builds one non-duplicated payload for 500 meters with ten years of monthly data', () => {
    const original = workspaceSnapshot();
    const facilities = Array.from({ length: 50 }, (_, index) => facility({
      guid: `facility-${index}`, accountId: 'account-a'
    }));
    const meters = facilities.flatMap((facilityValue, facilityIndex) => Array.from({ length: 10 }, (_, meterIndex) => meter({
      guid: `meter-${facilityIndex}-${meterIndex}`, accountId: 'account-a', facilityId: facilityValue.guid
    })));
    const meterData = meters.flatMap(meterValue => Array.from({ length: 120 }, (_, monthIndex) => reading({
      guid: `reading-${meterValue.guid}-${monthIndex}`, meterId: meterValue.guid, facilityId: meterValue.facilityId,
      year: 2016 + Math.floor(monthIndex / 12), month: monthIndex % 12 + 1
    })));

    const built = buildWorkspaceCalendarizationRequest({ ...original, facilities, meters, meterData });

    expect(built.payload.meters).toHaveLength(500);
    expect(built.payload.allMeterData).toHaveLength(60_000);
    expect(new Set(built.payload.allMeterData.map(item => item.guid)).size).toBe(60_000);
  });
});

function workspaceSnapshot(): AccountWorkspaceSnapshot {
  const accountValue = account({
    guid: 'account-a', assessmentReportVersion: 'AR6', energyUnit: 'kWh', volumeLiquidUnit: 'kgal',
    volumeGasUnit: 'CCF', massUnit: 'kg', energyIsSource: true, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6
  });
  const facilityValue = facility({
    guid: 'facility-a', accountId: accountValue.guid, energyUnit: 'kWh', volumeLiquidUnit: 'kgal',
    volumeGasUnit: 'CCF', massUnit: 'kg', energyIsSource: false
  });
  const meterValue = meter({
    guid: 'meter-a', accountId: accountValue.guid, facilityId: facilityValue.guid,
    source: 'Electricity', startingUnit: 'kWh', energyUnit: 'kWh',
    displayEnergyUnit: 'GJ', displayEnergyIsSource: true
  });
  return {
    account: accountValue,
    facilities: [facilityValue],
    meters: [meterValue],
    meterData: [reading({ accountId: accountValue.guid, facilityId: facilityValue.guid, meterId: meterValue.guid, totalEnergyUse: 100 })],
    meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}
