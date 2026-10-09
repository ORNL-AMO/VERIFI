import { AnalysisGroup } from '@data/models/analysis';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { FacilityAnalysisResultsValue, FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import {
  calculateFacilityAnalysisOutcomeResults,
  calculateFacilityAnalysisResults,
  projectFacilityAnalysisOutcomeResults
} from './facility-analysis-results-calculation';

describe('projectFacilityAnalysisOutcomeResults', () => {
  it('matches the full calculation annual history and newest dashboard month without group results', () => {
    const request = requestFixture();

    const full = calculateFacilityAnalysisResults(request);
    const outcome = calculateFacilityAnalysisOutcomeResults(request);

    expect(full.annualAnalysisSummaries).toHaveLength(2);
    expect(full.monthlyAnalysisSummaryData).toHaveLength(33);
    expect(outcome.annualAnalysisSummaries).toEqual(full.annualAnalysisSummaries);
    expect(outcome.monthlyAnalysisSummaryData).toEqual([full.monthlyAnalysisSummaryData.at(-1)]);
    expect(outcome.groupSummaries).toEqual([]);
  });

  it('returns annual rows through the report year and the newest valid monthly row without group payloads', () => {
    const value = {
      itemId: 'analysis-a',
      reportYear: 2025,
      annualAnalysisSummaries: [
        { year: 2024, totalSavingsPercentImprovement: 2 },
        { year: 2025, totalSavingsPercentImprovement: 3 }
      ],
      monthlyAnalysisSummaryData: [
        { date: new Date(2026, 0, 1), rolling12MonthImprovement: 4 },
        { date: new Date('invalid'), rolling12MonthImprovement: 99 },
        { date: new Date(2026, 2, 1), rolling12MonthImprovement: 5 }
      ],
      groupSummaries: [{ group: {}, monthlyAnalysisSummaryData: [{}], annualAnalysisSummaryData: [{}] }]
    } as unknown as FacilityAnalysisResultsValue;

    const outcome = projectFacilityAnalysisOutcomeResults(value);

    expect(outcome.annualAnalysisSummaries).toEqual(value.annualAnalysisSummaries);
    expect(outcome.monthlyAnalysisSummaryData).toEqual([value.monthlyAnalysisSummaryData[2]]);
    expect(outcome.groupSummaries).toEqual([]);
  });

  it('retains earlier annual rows when the requested report year is unavailable', () => {
    const outcome = projectFacilityAnalysisOutcomeResults({
      itemId: 'analysis-a',
      reportYear: 2025,
      annualAnalysisSummaries: [{ year: 2024 }],
      monthlyAnalysisSummaryData: [{ date: new Date('invalid') }],
      groupSummaries: []
    } as unknown as FacilityAnalysisResultsValue);

    expect(outcome.annualAnalysisSummaries).toEqual([{ year: 2024 }]);
    expect(outcome.monthlyAnalysisSummaryData).toEqual([]);
  });

  it('omits annual rows after the report year and rows without a finite year', () => {
    const outcome = projectFacilityAnalysisOutcomeResults({
      itemId: 'analysis-a',
      reportYear: 2025,
      annualAnalysisSummaries: [{ year: 2024 }, { year: Number.NaN }, { year: 2026 }],
      monthlyAnalysisSummaryData: [],
      groupSummaries: []
    } as unknown as FacilityAnalysisResultsValue);

    expect(outcome.annualAnalysisSummaries).toEqual([{ year: 2024 }]);
  });
});

function requestFixture(): FacilityAnalysisResultsWorkerRequest {
  const group = {
    idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
    specifiedMonthlyPercentBaseload: false, averagePercentBaseload: 0,
    monthlyPercentBaseload: [], dataAdjustments: [], baselineAdjustmentsV2: [],
    isGeneratedModel: false, maxModelVariables: 4, applyBanking: false
  } as AnalysisGroup;
  const facility = {
    guid: 'facility-a', accountId: 'account-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true, isNewFacility: false
  } as IdbFacility;
  const analysis = {
    guid: 'analysis-a', accountId: 'account-a', facilityId: facility.guid, name: 'Analysis A',
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    baselineYear: 2020, hasBanking: false, groups: [group]
  } as IdbAnalysisItem;
  return {
    analysisItem: analysis,
    facility,
    calanderizedMeters: [{
      meter: {
        guid: 'meter-a', facilityId: facility.guid, groupId: group.idbGroupId,
        source: 'Electricity', noLongerInUse: false
      },
      monthlyData: [
        ...yearData(2020, 100),
        ...yearData(2021, 80),
        ...yearData(2022, 70).slice(0, 9)
      ]
    } as CalanderizedMeter],
    accountPredictorEntries: [],
    accountPredictors: [],
    accountAnalysisItems: [analysis],
    calculateAllMonthlyData: true,
    includeGroupSummaries: false,
    reportYear: 2021
  };
}

function yearData(year: number, energyUse: number): MonthlyData[] {
  return Array.from({ length: 12 }, (_, month) => ({
    date: new Date(year, month, 1), year, monthNumValue: month, fiscalYear: year,
    energyUse, energyConsumption: energyUse
  } as MonthlyData));
}
