import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { reportFixture, reportSnapshot } from '../../testing/report-test-fixtures';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { buildPredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { getZeroEmissionsResults } from '@domain/calculations/emissions-calculations/emissions';
import { buildDataQualityReportSnapshot } from '../data-quality-report.view';
import { dataQualitySettingsDraft, METER_CONTENT_FLAGS, PREDICTOR_CONTENT_FLAGS } from '../data-quality-report-settings';

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

export function dataQualityDistributionSnapshot() {
  const snapshot = dataQualityPredictorReadingsSnapshot();
  Object.assign(snapshot.facilityReports[0].dataQualityReportSettings, {
    includeMeterStatisticsTable: false, includeMeterConsumptionTimeseriesGraph: false, includeMeterCostTimeseriesGraph: false,
    includePredictorStatisticsTable: false, includePredictorTimeseriesGraph: false,
    includeMeterConsumptionHistogram: true, includeMeterCostHistogram: true, includePredictorHistogram: true
  });
  return snapshot;
}

export function dataQualityPdfSnapshot() {
  const workspace = dataQualityPredictorReadingsSnapshot();
  const report = workspace.facilityReports[0], settings = dataQualitySettingsDraft(report.dataQualityReportSettings);
  for (const flag of [...METER_CONTENT_FLAGS, ...PREDICTOR_CONTENT_FLAGS]) settings[flag] = true;
  settings.includeAnnualTotalsTable = true;
  const meter = workspace.meters[0], predictor = workspace.predictors[0];
  const results = {
    meters: [buildMeterDataQualityReport(workspace.meterData.filter(row => row.meterId === meter.guid), meter)],
    predictors: [buildPredictorDataQualityReport(
      workspace.predictorData.filter(row => row.predictorId === predictor.guid), predictor)],
    annualTotals: [{ meterGuid: meter.guid, columns: [
      { key: 'year' as const, label: 'Year' },
      { key: 'energyUse' as const, label: 'Total Energy', unit: 'MMBtu' },
      { key: 'energyCost' as const, label: 'Total Cost', unit: '$' }
    ], rows: [2025, 2024].map(year => ({ ...getZeroEmissionsResults(), year,
      energyConsumption: 130, energyUse: 130, energyCost: year === 2025 ? 260 : 250 })) }]
  };
  return { ...buildDataQualityReportSnapshot(report, workspace.facilities[0], settings, results), results };
}
