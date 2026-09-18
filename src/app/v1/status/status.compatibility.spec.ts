import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { PredictorStatusCheck } from '@domain/calculations/status-check-calculations/predictorStatusCheck';
import { account, calendarizedMeter, facility, group, meter, monthlyData, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { evaluateWorkspaceStatus } from './status.evaluator';

describe('v0-to-v1 status comparison fixtures', () => {
  it('preserves established meter error detection while emitting structured v1 findings', () => {
    const meterValue = meter({ guid: 'meter-a', groupId: 'group-a', canBeNegative: false, meterReadingDataApplication: 'fullMonth' });
    const readings = [
      reading({ guid: 'r1', month: 1, year: 2026, totalEnergyUse: -1 }),
      reading({ guid: 'r2', month: 1, year: 2026, totalEnergyUse: 5 }),
      reading({ guid: 'r3', month: 3, year: 2026, totalEnergyUse: 5 })
    ];
    const calendarized = calendarizedMeter(meterValue, [
      monthlyData({ year: 2026, monthNumValue: 0 }),
      monthlyData({ year: 2026, monthNumValue: 2 })
    ]);
    const legacy = new MeterStatusCheck(meterValue, readings, calendarized, { month: 3, year: 2026 });
    const current = evaluateWorkspaceStatus({ snapshot: snapshot({ meters: [meterValue], meterData: readings }), calendarizedMeters: [calendarized], revision: 1, asOfDate: new Date(2026, 3, 1) });
    const meterCodes = current.findings.filter(item => item.entity.guid === meterValue.guid).map(item => item.code);

    expect(legacy.status).toBe('error');
    expect(meterCodes).toEqual(expect.arrayContaining(['meter.data.duplicate-date', 'meter.data.negative', 'meter.data.gap']));
  });

  it('documents the intentional change from one prioritized legacy action to simultaneous predictor findings', () => {
    const predictorValue = predictor();
    const data = [predictorData({ guid: 'p1', month: 1 }), predictorData({ guid: 'p2', month: 3 })];
    const legacy = new PredictorStatusCheck(predictorValue, data, { month: 4, year: 2026 }, false);
    const facilityMeter = meter({ guid: 'meter-a', groupId: 'group-a' });
    const current = evaluateWorkspaceStatus({
      snapshot: snapshot({ meters: [facilityMeter], predictors: [predictorValue], predictorData: data }),
      calendarizedMeters: [calendarizedMeter(facilityMeter, [monthlyData({ year: 2026, monthNumValue: 3 })])],
      revision: 1,
      asOfDate: new Date(2026, 3, 1)
    });
    const predictorCodes = current.findings.filter(item => item.entity.guid === predictorValue.guid).map(item => item.code);

    expect(legacy.status).toBe('error');
    expect(legacy.actions).toHaveLength(1);
    expect(predictorCodes).toEqual(expect.arrayContaining(['predictor.data.gap', 'predictor.currency.behind-facility']));
  });
});

function snapshot(overrides: Partial<AccountWorkspaceSnapshot> = {}): AccountWorkspaceSnapshot {
  return {
    account: account({ dataStalenessSettings: { enabled: false, thresholdMonths: 3 } }),
    facilities: [facility({ dataStalenessSettings: { enabled: false, thresholdMonths: 3, useAccountSettings: true } })],
    meters: [meter({ guid: 'meter-a', groupId: 'group-a' })], meterData: [], meterGroups: [group({ guid: 'group-a' })],
    predictors: [predictor()], predictorData: [predictorData()], facilityAnalyses: [], accountAnalyses: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [],
    ...overrides
  };
}

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', predictorType: 'Standard',
    canBeNegative: false, ignoreDateStatusChecks: false, ...overrides
  } as IdbPredictor;
}

function predictorData(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'predictor-data-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    month: 1, year: 2026, amount: 10, weatherDataWarning: false, weatherOverride: false, ...overrides
  } as IdbPredictorData;
}
