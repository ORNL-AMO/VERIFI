import { AccountAnalysisResultsValue } from '@platform/web-workers/account-analysis-results-worker.contract';
import { AccountAnalysisResultsWorkerRequest } from '@platform/web-workers/account-analysis-results-worker.contract';
import { AnalysisGroup, AnalysisGroupPredictorVariable } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import {
  calculateAccountAnalysisDashboardResults,
  calculateAccountAnalysisResults,
  projectAccountAnalysisDashboardResults
} from './account-analysis-results-calculation';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AnnualAccountAnalysisSummaryClass } from './annualAccountAnalysisSummaryClass';

describe('account analysis dashboard result projection', () => {
  it('keeps annual history through the report year and only the newest valid month', () => {
    const value = {
      itemId: 'analysis-a',
      reportYear: 2024,
      annualAnalysisSummaries: [{ year: 2023 }, { year: 2024 }, { year: 2025 }],
      monthlyAnalysisSummaryData: [
        { date: new Date('2024-01-01') },
        { date: new Date('invalid') },
        { date: new Date('2024-03-01') }
      ]
    } as unknown as AccountAnalysisResultsValue;

    const projected = projectAccountAnalysisDashboardResults(value);

    expect(projected.annualAnalysisSummaries.map(row => row.year)).toEqual([2023, 2024]);
    expect(projected.monthlyAnalysisSummaryData).toHaveLength(1);
    expect(new Date(projected.monthlyAnalysisSummaryData[0].date).getUTCMonth()).toBe(2);
    expect(projected.facilitySummaries).toBeUndefined();
  });

  it('preserves full numeric precision', () => {
    const precise = 12.345678901234;
    const value = {
      itemId: 'analysis-a', reportYear: 2024,
      annualAnalysisSummaries: [{ year: 2024, totalSavingsPercentImprovement: precise }],
      monthlyAnalysisSummaryData: []
    } as unknown as AccountAnalysisResultsValue;
    expect(projectAccountAnalysisDashboardResults(value).annualAnalysisSummaries[0].totalSavingsPercentImprovement)
      .toBe(precise);
  });

  it('uses the same deterministic calculation for full and dashboard execution', () => {
    const account = getNewIdbAccount();
    account.guid = 'account-a';
    account.sustainabilityQuestions.energyReductionBaselineYear = 2022;
    const analysis = getNewIdbAccountAnalysisItem('energy', account, []);
    analysis.guid = 'analysis-a';
    const request = {
      accountAnalysisItem: analysis,
      account,
      accountFacilities: [],
      accountPredictorEntries: [],
      allAccountAnalysisItems: [],
      calculateAllMonthlyData: false,
      meters: [], meterData: [], accountPredictors: [], reportYear: 2022
    };
    expect(calculateAccountAnalysisDashboardResults(request))
      .toEqual(projectAccountAnalysisDashboardResults(calculateAccountAnalysisResults(request)));
  });

  it.each([
    ['energy with mixed facility units and site/source conversion', { secondFacility: true }],
    ['water with a skipped facility and zero report values', { category: 'water' as const, secondFacility: true, skipSecond: true, reportValue: 0 }],
    ['a non-calendar fiscal year', { nonCalendarFiscalYear: true }]
  ])('matches the established account calculation for %s', (_label, options) => {
    const request = calculationRequestFixture(options);
    const expected = legacyCalculation(request);
    const result = calculateAccountAnalysisResults(request);

    expect(result).toEqual(expected);
    expect(result.annualAnalysisSummaries.map(row => row.year)).toEqual([2020, 2021]);
    expect(result.monthlyAnalysisSummaryData.length).toBeGreaterThan(0);
  });

  it('preserves banking dependencies through the deterministic entry point', () => {
    const request = calculationRequestFixture({ banking: true, reportYear: 2022 });
    const result = calculateAccountAnalysisResults(request);

    expect(request.allAccountAnalysisItems.map(item => item.guid)).toContain('banked-analysis-a');
    expect(result).toEqual(legacyCalculation(request));
    expect(result.annualAnalysisSummaries.map(row => row.year)).toEqual([2020, 2021, 2022]);
  });

  it('retains missing-predictor flags and zero values', () => {
    const request = calculationRequestFixture({ includePredictor: true, reportValue: 0 });
    const result = calculateAccountAnalysisResults(request);

    expect(result).toEqual(legacyCalculation(request));
    expect(result.annualAnalysisSummaries.find(row => row.year === 2021)).toMatchObject({
      energyUse: 0,
      missingPredictorValue: true,
      missingPredictors: ['predictor-a']
    });
  });
});

interface CalculationFixtureOptions {
  readonly category?: 'energy' | 'water';
  readonly secondFacility?: boolean;
  readonly skipSecond?: boolean;
  readonly nonCalendarFiscalYear?: boolean;
  readonly banking?: boolean;
  readonly includePredictor?: boolean;
  readonly reportValue?: number;
  readonly reportYear?: number;
}

function calculationRequestFixture(options: CalculationFixtureOptions = {}): AccountAnalysisResultsWorkerRequest {
  const category = options.category ?? 'energy';
  const reportYear = options.reportYear ?? 2021;
  const fiscal = options.nonCalendarFiscalYear ? 'nonCalendarYear' : 'calendarYear';
  const fiscalMonth = options.nonCalendarFiscalYear ? 6 : 0;
  const account = {
    ...getNewIdbAccount(), guid: 'account-a', fiscalYear: fiscal, fiscalYearMonth: fiscalMonth,
    fiscalYearCalendarEnd: true, energyIsSource: true,
    sustainabilityQuestions: {
      ...getNewIdbAccount().sustainabilityQuestions,
      energyReductionBaselineYear: 2020,
      waterReductionBaselineYear: 2020
    }
  } as IdbAccount;
  const facilities = [
    facilityFixture('facility-a', account, false, category === 'energy' ? 'MMBtu' : 'gal'),
    ...(options.secondFacility
      ? [facilityFixture('facility-b', account, true, category === 'energy' ? 'kWh' : 'm3')]
      : [])
  ];
  const analyses = facilities.map((facility, index) => facilityAnalysisFixture(
    `facility-analysis-${index + 1}`,
    facility,
    category,
    options.includePredictor && index === 0,
    options.banking && index === 0
  ));
  const bankedAnalysis = options.banking
    ? facilityAnalysisFixture('banked-analysis-a', facilities[0], category, false, false)
    : undefined;
  if (bankedAnalysis) {
    analyses[0] = {
      ...analyses[0], hasBanking: true, bankedAnalysisItemId: bankedAnalysis.guid,
      groups: analyses[0].groups.map(group => ({
        ...group, applyBanking: true, newBaselineYear: 2021, bankedAnalysisYear: 2020
      }))
    };
  }
  const accountAnalysis = {
    guid: 'account-analysis-a', accountId: account.guid, name: 'Account Analysis', analysisCategory: category,
    baselineYear: 2020, energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
    facilityAnalysisItems: facilities.map((facility, index) => ({
      facilityId: facility.guid,
      analysisItemId: options.skipSecond && index === 1 ? 'skip' : analyses[index].guid
    }))
  } as IdbAccountAnalysisItem;
  const meters = facilities.map((facility, index) => meterFixture(
    `meter-${index + 1}`,
    facility,
    analyses[index].groups[0].idbGroupId,
    category
  ));
  const meterData = meters.flatMap((meter, index) => [
    ...meterYearData(meter, 2020, 100 + index * 10, category),
    ...meterYearData(meter, 2021, options.reportValue ?? 80, category),
    ...(reportYear >= 2022 ? meterYearData(meter, 2022, 70, category) : [])
  ]);
  const predictor = options.includePredictor ? predictorFixture(facilities[0]) : undefined;
  const predictorData = predictor ? [
    ...predictorYearData(predictor, 2020, 10),
    ...predictorYearData(predictor, 2021, 8).slice(0, 11)
  ] : [];
  return {
    accountAnalysisItem: accountAnalysis,
    account,
    accountFacilities: facilities,
    accountPredictorEntries: predictorData,
    allAccountAnalysisItems: [...analyses, ...(bankedAnalysis ? [bankedAnalysis] : [])],
    calculateAllMonthlyData: false,
    meters,
    meterData,
    accountPredictors: predictor ? [predictor] : [],
    reportYear
  };
}

function legacyCalculation(request: AccountAnalysisResultsWorkerRequest): AccountAnalysisResultsValue {
  const calculation = new AnnualAccountAnalysisSummaryClass(
    structuredClone(request.accountAnalysisItem),
    structuredClone(request.account),
    structuredClone([...request.accountFacilities]),
    structuredClone([...request.accountPredictorEntries]),
    structuredClone([...request.allAccountAnalysisItems]),
    request.calculateAllMonthlyData,
    structuredClone([...request.meters]),
    structuredClone([...request.meterData]),
    structuredClone([...request.accountPredictors]),
    { reportYear: request.reportYear }
  );
  return {
    itemId: request.accountAnalysisItem.guid,
    annualAnalysisSummaries: calculation.getAnnualAnalysisSummaries(),
    monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData,
    facilitySummaries: calculation.facilitySummaries.map(summary => ({
      facilityGuid: summary.facility.guid,
      analysisGuid: summary.analysisItem.guid,
      monthlySummaryData: summary.monthlySummaryData
    })),
    reportYear: calculation.reportYear
  };
}

function facilityFixture(
  guid: string,
  account: IdbAccount,
  source: boolean,
  unit: string
): IdbFacility {
  return {
    guid, accountId: account.guid, name: guid, fiscalYear: account.fiscalYear,
    fiscalYearMonth: account.fiscalYearMonth, fiscalYearCalendarEnd: account.fiscalYearCalendarEnd,
    energyIsSource: source, energyUnit: unit, volumeLiquidUnit: unit, unitsOfMeasure: 'Imperial',
    sustainabilityQuestions: account.sustainabilityQuestions, isNewFacility: false
  } as IdbFacility;
}

function facilityAnalysisFixture(
  guid: string,
  facility: IdbFacility,
  category: 'energy' | 'water',
  includePredictor: boolean,
  banking: boolean
): IdbAnalysisItem {
  const predictorVariables = includePredictor ? [predictorVariable()] : [];
  return {
    guid, accountId: facility.accountId, facilityId: facility.guid, name: guid, analysisCategory: category,
    energyIsSource: facility.energyIsSource, energyUnit: facility.energyUnit, waterUnit: facility.volumeLiquidUnit,
    baselineYear: 2020, hasBanking: banking, bankedAnalysisItemId: banking ? 'banked-analysis-a' : undefined,
    groups: [groupFixture(`${facility.guid}-group`, includePredictor ? 'energyIntensity' : 'absoluteEnergyConsumption', predictorVariables)]
  } as IdbAnalysisItem;
}

function groupFixture(
  guid: string,
  analysisType: AnalysisGroup['analysisType'],
  predictorVariables: AnalysisGroupPredictorVariable[] = []
): AnalysisGroup {
  return {
    idbGroupId: guid, analysisType, predictorVariables, regressionModelYear: 2020, regressionConstant: 0,
    regressionModelStartMonth: undefined, regressionStartYear: undefined,
    regressionModelEndMonth: undefined, regressionEndYear: undefined,
    specifiedMonthlyPercentBaseload: false, averagePercentBaseload: 0, monthlyPercentBaseload: [],
    dataAdjustments: [], baselineAdjustmentsV2: [], isGeneratedModel: false, maxModelVariables: 4,
    applyBanking: false, newBaselineYear: undefined, bankedAnalysisYear: undefined
  };
}

function meterFixture(
  guid: string,
  facility: IdbFacility,
  groupId: string,
  category: 'energy' | 'water'
): IdbUtilityMeter {
  const isWater = category === 'water';
  return {
    guid, accountId: facility.accountId, facilityId: facility.guid, groupId,
    source: isWater ? 'Water Intake' : 'Electricity', startingUnit: isWater ? facility.volumeLiquidUnit : facility.energyUnit,
    energyUnit: facility.energyUnit, scope: 3, siteToSource: 3, meterReadingDataApplication: 'fullMonth',
    noLongerInUse: false
  } as IdbUtilityMeter;
}

function meterYearData(
  meter: IdbUtilityMeter,
  year: number,
  value: number,
  category: 'energy' | 'water'
): IdbUtilityMeterData[] {
  return Array.from({ length: 12 }, (_, month) => ({
    guid: `${meter.guid}-${year}-${month}`, meterId: meter.guid, accountId: meter.accountId,
    facilityId: meter.facilityId, day: 1, month: month + 1, year,
    totalEnergyUse: category === 'energy' ? value : 0,
    totalVolume: category === 'water' ? value : value,
    totalCost: 0, checked: false
  } as IdbUtilityMeterData));
}

function predictorFixture(facility: IdbFacility): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: facility.accountId, facilityId: facility.guid,
    name: 'Production', unit: 'units', production: true, productionInAnalysis: true
  } as IdbPredictor;
}

function predictorVariable(): AnalysisGroupPredictorVariable {
  return {
    id: 'predictor-a', name: 'Production', unit: 'units', production: true,
    productionInAnalysis: true, regressionCoefficient: 1
  };
}

function predictorYearData(predictor: IdbPredictor, year: number, amount: number): IdbPredictorData[] {
  return Array.from({ length: 12 }, (_, month) => ({
    guid: `${predictor.guid}-${year}-${month}`, predictorId: predictor.guid,
    accountId: predictor.accountId, facilityId: predictor.facilityId,
    year, month: month + 1, amount, weatherDataWarning: false, weatherOverride: false
  } as IdbPredictorData));
}
