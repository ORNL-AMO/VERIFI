import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

export function modelingSnapshot() {
  const original = regressionAnalysisReportFixture();
  const report = { ...getNewIdbFacilityReport('facility', 'account', 'modeling', []), id: 70, guid: 'modeling-report',
    analysisItemId: 'facility-analysis', name: 'Plant modeling' };
  report.modelingReportSettings.reportYear = 2023;
  return { ...original, accountAnalyses: [], facilityReports: [report],
    meterGroups: [{ ...getNewIdbUtilityMeterGroup('Energy', 'Main meters', 'facility', 'account'), guid: 'group' }] };
}
export function modelingMeters(snapshot = modelingSnapshot()) {
  return getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], snapshot.facilities[0], false,
    { energyIsSource: false, neededUnits: snapshot.facilityAnalyses[0].analysisCategory === 'water' ? 'kgal' : 'MMBtu' }, [], [], [...snapshot.facilities], snapshot.account.assessmentReportVersion, []);
}
