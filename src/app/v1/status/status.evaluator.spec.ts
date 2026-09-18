import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { calendarizedMeter, facility, group, meter, monthlyData, reading, account } from '@app/v1/facility/data/meters/facility-meters.testing';
import { evaluateWorkspaceStatus, isOlderThanThreshold } from './status.evaluator';
import { StatusRuleCode } from './status.models';

describe('v1 workspace status evaluator', () => {
  it('reports account and facility readiness without creating parent duplicates', () => {
    const emptyAccount = evaluate(snapshot({ facilities: [] }));
    expect(codes(emptyAccount)).toContain('account.facilities.missing');

    const emptyFacility = evaluate(snapshot({ meters: [], meterGroups: [], predictors: [] }));
    expect(codes(emptyFacility)).toEqual(expect.arrayContaining([
      'facility.meters.missing',
      'facility.predictors.missing'
    ]));
    expect(codes(emptyFacility)).not.toContain('facility.meter-groups.missing');

    const ungroupedFacility = evaluate(snapshot({ meterGroups: [] }));
    expect(codes(ungroupedFacility)).toContain('facility.meter-groups.missing');
  });

  it('suppresses derived meter and predictor findings when no data exists', () => {
    const result = evaluate(snapshot({ meterData: [], predictorData: [] }));
    expect(entityCodes(result, 'meter-a')).toEqual(expect.arrayContaining(['meter.data.missing']));
    expect(entityCodes(result, 'meter-a')).not.toEqual(expect.arrayContaining([
      'meter.data.gap', 'meter.currency.stale', 'meter.currency.behind-facility',
      'meter.quality.consumption-outlier', 'meter.quality.cost-outlier'
    ]));
    expect(entityCodes(result, 'predictor-a')).toEqual(['predictor.data.missing']);
  });

  it('reports independent meter problems together and honors the negative-value exception', () => {
    const configuredMeter = meter({ meterReadingDataApplication: 'fullMonth', canBeNegative: false });
    const duplicateNegative = [
      reading({ guid: 'r1', month: 1, year: 2026, totalEnergyUse: -5 }),
      reading({ guid: 'r2', month: 1, year: 2026, totalEnergyUse: 10 }),
      reading({ guid: 'r3', month: 3, year: 2026, totalEnergyUse: 15 })
    ];
    const result = evaluate(snapshot({ meters: [configuredMeter], meterData: duplicateNegative }));
    expect(entityCodes(result, configuredMeter.guid)).toEqual(expect.arrayContaining([
      'meter.data.duplicate-date', 'meter.data.negative', 'meter.data.gap'
    ]));

    const allowed = evaluate(snapshot({ meters: [{ ...configuredMeter, canBeNegative: true }], meterData: duplicateNegative }));
    expect(entityCodes(allowed, configuredMeter.guid)).not.toContain('meter.data.negative');
  });

  it('accepts the effective heat capacity displayed by meter settings without rewriting legacy data', () => {
    const naturalGasMeter = meter({
      source: 'Natural Gas',
      scope: 1,
      startingUnit: 'ft3',
      energyUnit: 'MMBtu',
      heatCapacity: undefined
    });
    const derivedDefault = evaluate(snapshot({ meters: [naturalGasMeter] }));
    expect(configurationFields(derivedDefault, naturalGasMeter.guid)).not.toContain('heatCapacity');

    const numericString = evaluate(snapshot({
      meters: [{ ...naturalGasMeter, heatCapacity: '0.001029' as unknown as number }]
    }));
    expect(configurationFields(numericString, naturalGasMeter.guid)).not.toContain('heatCapacity');

    const explicitlyInvalid = evaluate(snapshot({ meters: [{ ...naturalGasMeter, heatCapacity: -1 }] }));
    expect(configurationFields(explicitlyInvalid, naturalGasMeter.guid)).toContain('heatCapacity');
  });

  it('uses an explicit evaluation date and treats the exact staleness threshold as current', () => {
    expect(isOlderThanThreshold(new Date(2026, 0, 17), new Date(2026, 3, 17), 3)).toBe(false);
    expect(isOlderThanThreshold(new Date(2026, 0, 16), new Date(2026, 3, 17), 3)).toBe(true);
  });

  it('keeps validation findings independent from meter display unit and basis preferences', () => {
    const original = snapshot();
    const withDisplayOverrides = snapshot({
      meters: [{ ...original.meters[0], displayEnergyUnit: 'GJ', displayEnergyIsSource: true }]
    });

    expect(evaluate(withDisplayOverrides).findings.map(finding => finding.code))
      .toEqual(evaluate(original).findings.map(finding => finding.code));
  });

  it('combines wall-clock staleness and facility lag into one primary currency finding', () => {
    const result = evaluate(
      snapshot({ meterData: [reading({ month: 1, year: 2025 })] }),
      [calendarizedMeter(meter({ guid: 'meter-b' }), [monthlyData({ year: 2026, monthNumValue: 2 })])],
      new Date(2026, 3, 17)
    );
    expect(entityCodes(result, 'meter-a').filter(code => code.startsWith('meter.currency'))).toEqual(['meter.currency.stale']);
    const finding = result.findings.find(item => item.code === 'meter.currency.stale' && item.entity.guid === 'meter-a');
    expect(finding?.evidence.facilityLatestPeriod).toBe('2026-03');
  });

  it('honors date, retirement, weather, and predictor negative-value exceptions independently', () => {
    const predictorValue = predictor({
      predictorType: 'Weather',
      canBeNegative: true,
      ignoreWeatherDataWarning: true,
      noLongerInUse: true,
      noLongerInUseMonth: 2,
      noLongerInUseYear: 2026
    });
    const result = evaluate(snapshot({
      predictors: [predictorValue],
      predictorData: [predictorData({ amount: -2, month: 3, year: 2026, weatherDataWarning: true })]
    }), [], new Date(2027, 0, 1));
    expect(entityCodes(result, predictorValue.guid)).not.toEqual(expect.arrayContaining([
      'predictor.data.negative', 'predictor.currency.stale', 'predictor.weather.warning'
    ]));
  });

  it('reports analysis, account-analysis, and report setup errors', () => {
    const facilityAnalysis = {
      guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: '', groups: [],
      baselineYear: undefined, hasBanking: true, bankedAnalysisItemId: undefined
    } as unknown as IdbAnalysisItem;
    const accountAnalysis = {
      guid: 'account-analysis-a', accountId: 'account-a', name: '', baselineYear: undefined,
      facilityAnalysisItems: []
    } as unknown as IdbAccountAnalysisItem;
    const facilityReport = {
      guid: 'facility-report-a', accountId: 'account-a', facilityId: 'facility-a', name: '',
      facilityReportType: 'unknown'
    } as unknown as IdbFacilityReport;
    const accountReport = {
      guid: 'account-report-a', accountId: 'account-a', name: '', reportType: 'unknown',
      analysisReportSetup: {}, betterPlantsReportSetup: {}, performanceReportSetup: {}, accountSavingsReportSetup: {}
    } as unknown as IdbAccountReport;
    const result = evaluate(snapshot({ facilityAnalyses: [facilityAnalysis], accountAnalyses: [accountAnalysis], facilityReports: [facilityReport], accountReports: [accountReport] }));

    expect(entityCodes(result, facilityAnalysis.guid)).toContain('analysis.configuration.invalid');
    expect(entityCodes(result, accountAnalysis.guid)).toContain('account-analysis.configuration.invalid');
    expect(entityCodes(result, facilityReport.guid)).toContain('report.configuration.invalid');
    expect(entityCodes(result, accountReport.guid)).toContain('report.configuration.invalid');
  });
});

function snapshot(overrides: Partial<AccountWorkspaceSnapshot> = {}): AccountWorkspaceSnapshot {
  const meterValue = meter({ guid: 'meter-a', groupId: 'group-a', meterReadingDataApplication: 'fullMonth' });
  return {
    account: account({ dataStalenessSettings: { enabled: true, thresholdMonths: 3 } }),
    facilities: [facility({ dataStalenessSettings: { enabled: true, thresholdMonths: 3, useAccountSettings: true } })],
    meters: [meterValue],
    meterData: [reading({ guid: 'reading-a', month: 3, year: 2026 })],
    meterGroups: [group({ guid: 'group-a' })],
    predictors: [predictor()],
    predictorData: [predictorData()],
    facilityAnalyses: [],
    accountAnalyses: [],
    accountReports: [],
    facilityReports: [],
    customEmissions: [],
    customFuels: [],
    customGWPs: [],
    energyUseGroups: [],
    energyUseEquipment: [],
    ...overrides
  };
}

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', canBeNegative: false, ignoreDateStatusChecks: false,
    ...overrides
  } as IdbPredictor;
}

function predictorData(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'predictor-data-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    month: 3, year: 2026, amount: 10, weatherDataWarning: false, weatherOverride: false,
    ...overrides
  } as IdbPredictorData;
}

function evaluate(value: AccountWorkspaceSnapshot, calendarized?: ReturnType<typeof calendarizedMeter>[], asOfDate = new Date(2026, 3, 17)) {
  const resolvedCalendarized = calendarized ?? (value.meters[0]
    ? [calendarizedMeter(value.meters[0], [monthlyData({ year: 2026, monthNumValue: 2 })])]
    : []);
  return evaluateWorkspaceStatus({ snapshot: value, calendarizedMeters: resolvedCalendarized, revision: 7, asOfDate });
}

function codes(result: ReturnType<typeof evaluate>): StatusRuleCode[] {
  return result.findings.map(item => item.code);
}

function entityCodes(result: ReturnType<typeof evaluate>, guid: string): StatusRuleCode[] {
  return result.findings.filter(item => item.entity.guid === guid).map(item => item.code);
}

function configurationFields(result: ReturnType<typeof evaluate>, guid: string): string[] {
  const finding = result.findings.find(item => item.entity.guid === guid && item.code === 'meter.configuration.invalid');
  return (finding?.evidence.fields as string[] | undefined) ?? [];
}
