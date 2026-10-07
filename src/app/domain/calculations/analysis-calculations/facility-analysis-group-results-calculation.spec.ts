import { AnalysisGroup, AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { FacilityAnalysisGroupResultsWorkerRequest } from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { calculateFacilityAnalysisGroupResults } from './facility-analysis-group-results-calculation';

describe('calculateFacilityAnalysisGroupResults', () => {
  it('calculates deterministic absolute-consumption monthly and annual savings', () => {
    const request = requestFixture(groupFixture('absoluteEnergyConsumption'));

    const result = calculateFacilityAnalysisGroupResults(request);

    expect(result.reportYear).toBe(2021);
    expect(result.monthlyAnalysisSummaryData).toHaveLength(24);
    expect(result.annualAnalysisSummaryData).toHaveLength(2);
    expect(result.annualAnalysisSummaryData).toEqual([
      expect.objectContaining({ year: 2020, energyUse: 1200, adjusted: 1200, savings: 0 }),
      expect.objectContaining({ year: 2021, energyUse: 960, adjusted: 1200, savings: 240 })
    ]);
  });

  it('uses regression predictors without rounding the calculated result', () => {
    const predictor = predictorVariable();
    const request = requestFixture(groupFixture('regression', [predictor]), true);

    const result = calculateFacilityAnalysisGroupResults(request);
    const reportYear = result.annualAnalysisSummaryData.find(row => row.year === 2021);

    expect(reportYear).toMatchObject({
      energyUse: 960,
      adjusted: 1080,
      savings: 120,
      predictorUsage: [{ predictorId: predictor.id, usage: 108 }]
    });
    expect(result.monthlyAnalysisSummaryData.at(-1)).toMatchObject({
      modeledEnergy: 90,
      adjusted: 90,
      savings: 10,
      predictorUsage: [{ predictorId: predictor.id, usage: 9 }]
    });
  });

  it('rejects a request for a group that is not in the selected analysis', () => {
    const request = { ...requestFixture(groupFixture('absoluteEnergyConsumption')), groupGuid: 'missing-group' };

    expect(() => calculateFacilityAnalysisGroupResults(request))
      .toThrowError('The selected analysis group is no longer available.');
  });

  it('applies banked source savings to the new-baseline calculation', () => {
    const currentGroup = groupFixture('absoluteEnergyConsumption');
    currentGroup.applyBanking = true;
    currentGroup.bankedAnalysisYear = 2021;
    currentGroup.newBaselineYear = 2023;
    const baseRequest = requestFixture(currentGroup);
    const sourceGroup = groupFixture('absoluteEnergyConsumption');
    const source = {
      ...baseRequest.analysisItem,
      guid: 'source-analysis',
      name: 'Source analysis',
      baselineYear: 2020,
      groups: [sourceGroup]
    } as IdbAnalysisItem;
    const currentAnalysis = {
      ...baseRequest.analysisItem,
      baselineYear: 2023,
      hasBanking: true,
      bankedAnalysisItemId: source.guid,
      groups: [currentGroup]
    } as IdbAnalysisItem;
    const request: FacilityAnalysisGroupResultsWorkerRequest = {
      ...baseRequest,
      analysisItem: currentAnalysis,
      accountAnalysisItems: [currentAnalysis, source],
      calanderizedMeters: [meterFixture(currentGroup.idbGroupId, true)],
      reportYear: 2023
    };

    const result = calculateFacilityAnalysisGroupResults(request);

    expect(result.annualAnalysisSummaryData).toEqual([
      expect.objectContaining({
        year: 2023,
        savingsBanked: 144,
        savingsUnbanked: 0,
        isBanked: false,
        isIntermediateBanked: false
      })
    ]);
    expect(result.monthlyAnalysisSummaryData).toHaveLength(48);
    expect(result.monthlyAnalysisSummaryData.some(row => row.isBanked)).toBe(true);
    expect([...new Set(result.monthlyAnalysisSummaryData
      .filter(row => row.isIntermediateBanked)
      .map(row => row.fiscalYear))]).toEqual([2022]);
    expect([...new Set(result.monthlyAnalysisSummaryData
      .filter(row => row.isBanked && !row.isIntermediateBanked)
      .map(row => row.fiscalYear))]).toEqual([2020, 2021]);
    expect(result.monthlyAnalysisSummaryData.slice(-12).some(row => row.savingsBanked > 0)).toBe(true);
  });
});

function requestFixture(group: AnalysisGroup, includePredictor = false): FacilityAnalysisGroupResultsWorkerRequest {
  const facility = {
    guid: 'facility-a', accountId: 'account-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true, isNewFacility: false
  } as IdbFacility;
  const analysis = {
    guid: 'analysis-a', accountId: 'account-a', facilityId: facility.guid, name: 'Analysis A',
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    baselineYear: 2020, hasBanking: false, bankedAnalysisItemId: undefined, groups: [group]
  } as IdbAnalysisItem;
  return {
    analysisItem: analysis,
    groupGuid: group.idbGroupId,
    facility,
    calanderizedMeters: [meterFixture(group.idbGroupId)],
    accountPredictorEntries: includePredictor ? predictorDataFixture() : [],
    accountPredictors: includePredictor ? [{
      guid: 'predictor-a', facilityId: facility.guid, accountId: 'account-a', name: 'Production', unit: 'units'
    } as IdbPredictor] : [],
    accountAnalysisItems: [analysis],
    reportYear: 2021
  };
}

function groupFixture(
  analysisType: AnalysisGroup['analysisType'],
  predictorVariables: AnalysisGroupPredictorVariable[] = []
): AnalysisGroup {
  return {
    idbGroupId: 'group-a', analysisType, predictorVariables,
    regressionModelYear: 2020, regressionConstant: 0,
    regressionModelStartMonth: undefined, regressionStartYear: undefined,
    regressionModelEndMonth: undefined, regressionEndYear: undefined,
    specifiedMonthlyPercentBaseload: false, averagePercentBaseload: 0,
    monthlyPercentBaseload: [], dataAdjustments: [], baselineAdjustmentsV2: [],
    isGeneratedModel: false, maxModelVariables: 4, applyBanking: false,
    newBaselineYear: undefined, bankedAnalysisYear: undefined
  };
}

function predictorVariable(): AnalysisGroupPredictorVariable {
  return {
    id: 'predictor-a', name: 'Production', unit: 'units', production: true,
    productionInAnalysis: true, regressionCoefficient: 10
  };
}

function meterFixture(groupId: string, include2022 = false): CalanderizedMeter {
  const monthlyData = [
    ...yearData(2020, 100),
    ...yearData(2021, 80),
    ...(include2022 ? [...yearData(2022, 70), ...yearData(2023, 60)] : [])
  ];
  return {
    meter: {
      guid: 'meter-a', facilityId: 'facility-a', groupId, source: 'Electricity', noLongerInUse: false
    },
    monthlyData
  } as CalanderizedMeter;
}

function yearData(year: number, energyUse: number): MonthlyData[] {
  return Array.from({ length: 12 }, (_, month) => ({
    date: new Date(year, month, 1), year, monthNumValue: month, fiscalYear: year,
    energyUse, energyConsumption: energyUse
  } as MonthlyData));
}

function predictorDataFixture(): IdbPredictorData[] {
  return [
    ...predictorYearData(2020, 10),
    ...predictorYearData(2021, 9)
  ];
}

function predictorYearData(year: number, amount: number): IdbPredictorData[] {
  return Array.from({ length: 12 }, (_, month) => ({
    guid: `predictor-a-${year}-${month + 1}`,
    accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    year, month: month + 1, amount, weatherDataWarning: false, weatherOverride: false
  } as IdbPredictorData));
}
