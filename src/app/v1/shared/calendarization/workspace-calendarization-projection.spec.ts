import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getZeroEmissionsResults } from '@domain/calculations/emissions-calculations/emissions';
import { account, facility, meter } from '@app/v1/facility/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationBaseResult } from './workspace-calendarization.models';
import { projectWorkspaceCalendarization } from './workspace-calendarization-projection';

describe('workspace calendarization projection', () => {
  it('converts a selected slice into facility units, basis, and fiscal years without mutating the base', () => {
    const snapshot = workspaceSnapshot();
    const base = baseResult();
    const result = projectWorkspaceCalendarization(base, snapshot, {
      context: { kind: 'facility', guid: 'facility-a' }, meterGuids: ['meter-a'],
      energyUnit: 'GJ', energyIsSource: true, includeEmissions: false
    });

    expect(result.state).toBe('ready');
    expect(result.meters[0].energyUnit).toBe('GJ');
    expect(result.meters[0].energyIsSource).toBe(true);
    expect(result.meters[0].monthlyData[0].energyUse).toBeCloseTo(6.33036, 5);
    expect(result.meters[0].monthlyData[0].fiscalYear).toBe(2025);
    expect(result.meters[0].showElectricalEmissions).toBe(false);
    expect(base.meters[0].monthlyData[0].energyUse).toBe(2);
    expect(base.meters[0].energyUnit).toBe('MMBtu');
  });

  it('rejects meters outside the requested facility', () => {
    const result = projectWorkspaceCalendarization(baseResult(), workspaceSnapshot(), {
      context: { kind: 'facility', guid: 'facility-a' }, meterGuids: ['meter-b'], includeEmissions: false
    });

    expect(result.state).toBe('error');
    expect(result.error?.code).toBe('invalid-projection');
  });

  it('keeps a meter override separate from the facility projection used by aggregates', () => {
    const snapshot = workspaceSnapshot();
    const base = baseResult();
    const meterDisplay = projectWorkspaceCalendarization(base, snapshot, {
      context: { kind: 'facility', guid: 'facility-a' }, meterGuids: ['meter-a'],
      energyUnit: 'kWh', energyIsSource: true, includeEmissions: false
    });
    const facilityDisplay = projectWorkspaceCalendarization(base, snapshot, {
      context: { kind: 'facility', guid: 'facility-a' }, energyUnit: 'GJ', energyIsSource: false, includeEmissions: false
    });

    expect(meterDisplay.meters[0].energyUnit).toBe('kWh');
    expect(meterDisplay.meters[0].energyIsSource).toBe(true);
    expect(facilityDisplay.meters[0].energyUnit).toBe('GJ');
    expect(facilityDisplay.meters[0].energyIsSource).toBe(false);
  });
});

function workspaceSnapshot(): AccountWorkspaceSnapshot {
  const accountValue = account({ guid: 'account-a', assessmentReportVersion: 'AR6' });
  const facilityValue = facility({
    guid: 'facility-a', accountId: 'account-a', energyUnit: 'GJ', volumeLiquidUnit: 'kgal',
    energyIsSource: true, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true
  });
  return {
    account: accountValue, facilities: [facilityValue],
    meters: [meter({ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', siteToSource: 3 }),
      meter({ guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b' })],
    meterData: [], meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

function baseResult(): WorkspaceCalendarizationBaseResult {
  const baseMeter = meter({ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', siteToSource: 3 });
  const calendarized: CalanderizedMeter = {
    meter: baseMeter,
    consumptionUnit: 'MMBtu', energyUnit: 'MMBtu', energyIsSource: false,
    showConsumption: false, showEnergyUse: true, showElectricalEmissions: true,
    showOtherScope2Emissions: false, showStationaryEmissions: false, showFugitiveEmissions: false,
    showProcessEmissions: false, showMobileEmissions: false,
    monthlyData: [{
      ...getZeroEmissionsResults(), month: 'Jan', monthNumValue: 0, year: 2025, fiscalYear: 2025,
      energyConsumption: 2, energyUse: 2, energyCost: 10, date: new Date(2025, 0, 1), readingType: 'metered'
    }]
  };
  return { state: 'ready', accountGuid: 'account-a', inputFingerprint: 'fingerprint-a', meters: [calendarized] };
}
