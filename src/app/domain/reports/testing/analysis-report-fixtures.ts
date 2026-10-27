import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';

export function analysisReportFixture(category: 'energy' | 'water' = 'energy'): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account', energyIsSource: true };
  account.sustainabilityQuestions.energyReductionBaselineYear = 2022;
  account.sustainabilityQuestions.waterReductionBaselineYear = 2022;
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility', name: 'Plant A', energyIsSource: true };
  const group = getNewAnalysisGroup('group', []);
  group.analysisType = 'absoluteEnergyConsumption';
  const analysis = { ...getNewIdbAnalysisItem(account, facility, [], [], category), id: 3, guid: 'facility-analysis', groups: [group], energyUnit: 'MMBtu', waterUnit: 'kgal' };
  const rollup = { ...getNewIdbAccountAnalysisItem(category, account, [facility]), id: 4, guid: 'account-analysis', name: analysis.name, energyUnit: 'MMBtu', waterUnit: 'kgal', facilityItemsInitialized: true };
  rollup.facilityAnalysisItems[0].analysisItemId = analysis.guid;
  const meter = { ...getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu'), id: 5, guid: 'meter', groupId: group.idbGroupId, siteToSource: 1 };
  meter.meterReadingDataApplication = 'fullMonth';
  if (category === 'water') { meter.source = 'Water Intake'; meter.startingUnit = 'kgal'; meter.waterIntakeType = 'Municipal (Potable)'; }
  const meterData = Array.from({ length: 36 }, (_, index) => {
    const date = new Date(2022, index, 1);
    const value = index < 12 ? 100.25 : 80.125;
    return { ...getNewIdbUtilityMeterData(meter, []), id: index + 10, guid: `reading-${index}`, year: date.getFullYear(), month: date.getMonth() + 1, day: 1,
      totalEnergyUse: value, totalVolume: value, totalCost: 0 };
  });
  const report = { ...getNewIdbAccountReport(account, [facility], []), id: 50, guid: 'report', reportType: 'betterPlants' as const, reportYear: 2023, baselineYear: 2022 };
  report.betterPlantsReportSetup.analysisItemId = rollup.guid;
  return { account, facilities: [facility], meters: [meter], meterData, meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [analysis], accountAnalyses: [rollup],
    accountReports: [report], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [] };
}

/** Distinct predictor series and coefficients expose changes to GUID-to-coefficient mapping. */
export function regressionAnalysisReportFixture(): AccountWorkspaceSnapshot {
  const snapshot = analysisReportFixture();
  const predictors = [0, 1].map(index => ({ ...getNewIdbPredictor('account', 'facility'),
    id: 100 + index, guid: `predictor-${index}`, name: `Predictor ${index}`, production: index === 0 }));
  const group = snapshot.facilityAnalyses[0].groups[0];
  Object.assign(group, { analysisType: 'regression', isGeneratedModel: false, regressionModelYear: 2022,
    regressionStartYear: 2022, regressionEndYear: 2022, regressionModelStartMonth: 0, regressionModelEndMonth: 11,
    regressionConstant: 5, predictorVariables: predictors.map((predictor, index) => ({ id: predictor.guid,
      name: predictor.name, production: predictor.production, productionInAnalysis: true,
      regressionCoefficient: index === 0 ? 1 : 3, unit: 'units' })) });
  return { ...snapshot, predictors, predictorData: predictors.flatMap((predictor, index) => snapshot.meterData.map((reading, monthIndex) => ({
    ...getNewIdbPredictorData(predictor), id: 200 + index * 36 + monthIndex, guid: `${predictor.guid}-${monthIndex}`,
    year: reading.year, month: reading.month, amount: reading.year === 2022 ? [10, 20][index] : [12, 28][index]
  }))) };
}
