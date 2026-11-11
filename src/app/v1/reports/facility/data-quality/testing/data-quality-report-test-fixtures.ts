import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { reportFixture, reportSnapshot } from '../../testing/report-test-fixtures';

export function dataQualityReport(overrides: Parameters<typeof reportFixture>[0] = {}) {
  const report = reportFixture({ facilityReportType: 'dataQuality', ...overrides });
  report.dataQualityReportSettings = { ...report.dataQualityReportSettings,
    selectedMode: 'manual', selectedMeterIds: ['meter-a'], selectedPredictorIds: ['predictor-a'],
    includeMeterCostHistogram: false, includeAnnualTotalsTable: false };
  return report;
}

export function dataQualitySnapshot(reports = [dataQualityReport()]) {
  const account = { ...getNewIdbAccount(), guid: 'account-a', id: 1 };
  const facility = { ...getNewIdbFacility(account), guid: 'facility-a', id: 2 };
  const meters = ['a', 'b'].map((letter, index) => ({ ...getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu'),
    id: 10 + index, guid: `meter-${letter}`, name: `Meter ${letter}`, groupId: 'group-a' }));
  const predictors = ['a', 'b'].map((letter, index) => ({ ...getNewIdbPredictor(account.guid, facility.guid),
    id: 20 + index, guid: `predictor-${letter}`, name: `Predictor ${letter}` }));
  const group = getNewAnalysisGroup('group-a', predictors.map(predictor => ({ id: predictor.guid,
    name: predictor.name, unit: predictor.unit, production: true, productionInAnalysis: true, regressionCoefficient: 1 })));
  group.analysisType = 'energyIntensity';
  const analysis = { ...getNewIdbAnalysisItem(account, facility, [], [], 'energy'),
    id: 30, guid: 'analysis-a', name: 'Energy analysis', baselineYear: 2022, groups: [group] };
  const meterGroups = [{ ...getNewIdbUtilityMeterGroup('Energy', 'Energy group', facility.guid, account.guid), id: 40, guid: 'group-a' }];
  return { ...reportSnapshot(reports), account, facilities: [facility], meters, meterGroups, predictors, facilityAnalyses: [analysis], facilityReports: reports };
}

export function dataQualityReadingsSnapshot(reports = [dataQualityReport()]) {
  const snapshot = dataQualitySnapshot(reports);
  return { ...snapshot, meterData: snapshot.meters.flatMap((meter, meterIndex) => [10, 10, 10, 100].map((amount, index) => ({
    ...getNewIdbUtilityMeterData(meter, []), id: 100 + meterIndex * 10 + index, guid: `${meter.guid}-reading-${index}`,
    year: 2024, month: index === 1 ? 1 : index + 1, day: index === 1 ? 15 : 1, migratedDates: true,
    totalEnergyUse: amount, totalCost: amount * 2
  }))) };
}

export function dataQualityPredictorReadingsSnapshot(reports = [dataQualityReport()]) {
  const snapshot = dataQualityReadingsSnapshot(reports);
  snapshot.predictors[0].unit = 'tons';
  return { ...snapshot, predictorData: snapshot.predictors.flatMap((predictor, predictorIndex) => [10, 10, 11, 12, 100].map((amount, index) => ({
    ...getNewIdbPredictorData(predictor, []), id: 200 + predictorIndex * 10 + index, guid: `${predictor.guid}-reading-${index}`,
    year: 2024, month: index === 1 ? 1 : index + 1, amount,
    weatherDataWarning: index === 0, weatherDataChanged: index === 4
  }))) };
}

export function dataQualityHistogramSnapshot() {
  const snapshot = dataQualityPredictorReadingsSnapshot();
  Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
    includeMeterStatisticsTable: false, includeMeterConsumptionTimeseriesGraph: false, includeMeterCostTimeseriesGraph: false,
    includePredictorStatisticsTable: false, includePredictorTimeseriesGraph: false,
    includeMeterConsumptionHistogram: true, includeMeterCostHistogram: true, includePredictorHistogram: true
  });
  return snapshot;
}
