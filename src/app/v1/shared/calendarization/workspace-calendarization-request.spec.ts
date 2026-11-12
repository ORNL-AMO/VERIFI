import { SubregionEmissions } from '@data/models/eGridEmissions';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { account, facility, meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import {
  CANONICAL_ENERGY_UNIT,
  CANONICAL_GAS_UNIT,
  CANONICAL_LIQUID_UNIT,
  CANONICAL_MASS_UNIT,
  buildWorkspaceCalendarizationRequest, workspaceEmissionsRates
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

  it('passes bundled then current custom rates with exact canonical precedence and detached rate arrays', () => {
    const builtin: SubregionEmissions[] = [{ subregion: 'REGION', locationEmissionRates: [{ year: 2025, CO2: 10, CH4: 2, N2O: 3 }],
      residualEmissionRates: [{ year: 2025, CO2: 20, CH4: 4, N2O: 6 }] }];
    const custom = { ...getNewAccountEmissionsItem('account-a'), subregion: 'CUSTOM',
      locationEmissionRates: [{ year: 2025, CO2: 50, CH4: 0, N2O: 0, co2Emissions: 50 }],
      residualEmissionRates: [{ year: 2025, CO2: 60, CH4: 0, N2O: 0, co2Emissions: 60 }] };
    const snapshot = { ...workspaceSnapshot(), customEmissions: [custom] };
    const before = structuredClone({ builtin, snapshot });
    const request = buildWorkspaceCalendarizationRequest(snapshot, builtin);
    expect(request.payload.co2Emissions).toEqual([builtin[0], custom]);
    expect(workspaceEmissionsRates(snapshot)).toEqual([custom]);
    expect(request.payload.co2Emissions[0]).not.toBe(builtin[0]);
    expect(request.payload.co2Emissions[0].locationEmissionRates).not.toBe(builtin[0].locationEmissionRates);
    expect(request.payload.co2Emissions[1].residualEmissionRates[0]).not.toBe(custom.residualEmissionRates[0]);
    request.payload.co2Emissions[0].locationEmissionRates[0].CO2 = -1;
    request.payload.co2Emissions[1].residualEmissionRates[0].CO2 = -2;
    expect({ builtin, snapshot }).toEqual(before);
  });

  it('fingerprints all bundled rate values and uses only the current snapshot custom catalog', () => {
    const first = { ...workspaceSnapshot(), customEmissions: [{ ...getNewAccountEmissionsItem('account-a'), subregion: 'ACCOUNT-A' }] };
    const builtin: SubregionEmissions[] = [{ subregion: 'REGION', locationEmissionRates: [{ year: 2025, CO2: 10, CH4: 0, N2O: 0 }], residualEmissionRates: [] }];
    const initial = buildWorkspaceCalendarizationRequest(first, builtin);
    expect(buildWorkspaceCalendarizationRequest(first, structuredClone(builtin)).inputFingerprint).toBe(initial.inputFingerprint);
    const changed = structuredClone(builtin); changed[0].locationEmissionRates[0].CO2 = 11;
    expect(buildWorkspaceCalendarizationRequest(first, changed).inputFingerprint).not.toBe(initial.inputFingerprint);
    expect(buildWorkspaceCalendarizationRequest(first).inputFingerprint).not.toBe(initial.inputFingerprint);
    const second = { ...workspaceSnapshot(), account: { ...first.account, guid: 'account-b' },
      customEmissions: [{ ...getNewAccountEmissionsItem('account-b'), subregion: 'ACCOUNT-B' }] };
    expect(buildWorkspaceCalendarizationRequest(second, builtin).payload.co2Emissions.map(region => region.subregion)).toEqual(['REGION', 'ACCOUNT-B']);
    expect(first.customEmissions[0].subregion).toBe('ACCOUNT-A');
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
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], savedVisualizations: [], energyUseEquipment: []
  };
}
