import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';
import { UserDefinedInspectionRequest } from '../user-defined-inspection-calculation';

export function userDefinedInspectionFixture(): UserDefinedInspectionRequest {
  const group = {
    ...getNewAnalysisGroup('group-a', [{ id: 'predictor-a', name: 'Production', unit: 'tons', production: true,
      productionInAnalysis: true, regressionCoefficient: 2 }]),
    isGeneratedModel: false, regressionConstant: 1, regressionStartYear: 2023, regressionModelStartMonth: 0,
    regressionEndYear: 2023, regressionModelEndMonth: 11
  };
  const facility = { guid: 'facility-a', accountId: 'account-a', energyUnit: 'MMBtu', energyIsSource: false,
    fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true };
  const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: facility.guid, analysisCategory: 'energy',
    energyUnit: 'MMBtu', energyIsSource: false, baselineYear: 2024, groups: [group], hasBanking: false };
  const readings = Array.from({ length: 36 }, (_, index) => ({
    guid: `reading-${index}`, accountId: 'account-a', facilityId: facility.guid, meterId: 'meter-a',
    day: 1, month: index % 12 + 1, year: 2023 + Math.floor(index / 12), totalEnergyUse: 100, totalCost: 25,
    checked: false, migratedDates: true, isEstimated: false
  }));
  return {
    selectedGroup: group, analysisItem: analysis, facility,
    meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: facility.guid, groupId: group.idbGroupId, name: 'Gas',
      source: 'Natural Gas', startingUnit: 'MMBtu', energyUnit: 'MMBtu', meterReadingDataApplication: 'fullMonth',
      includeInEnergy: true, siteToSource: 1, scope: 1, retainRECs: false, recsMultiplier: 0, greenPurchaseFraction: 0,
      marketGHGMultiplier: 1, locationGHGMultiplier: 1 }],
    meterData: readings,
    accountPredictorEntries: readings.map((reading, index) => ({ guid: `predictor-data-${index}`, accountId: 'account-a',
      facilityId: facility.guid, predictorId: 'predictor-a', year: reading.year, month: reading.month,
      amount: reading.year === 2023 ? 10 : 20, migratedDates: true })),
    accountAnalysisItems: [analysis], assessmentReportVersion: 'AR6'
  } as unknown as UserDefinedInspectionRequest;
}
