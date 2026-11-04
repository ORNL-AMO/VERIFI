import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
export function facilityAnalysisReportFixture(snapshot = analysisReportFixture()) {
  const report = { ...getNewIdbFacilityReport('facility', 'account', 'analysis', []), id: 70, guid: 'facility-report', analysisItemId: 'facility-analysis', name: 'Plant analysis' };
  report.analysisReportSettings.reportYear = 2023;
  const facility = snapshot.facilities[0], analysis = snapshot.facilityAnalyses[0];
  const meters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], facility, false,
    { energyIsSource: analysis.energyIsSource, neededUnits: 'MMBtu' }, [], [], [facility], snapshot.account.assessmentReportVersion, []);
  const results = calculateFacilityAnalysisResults({ analysisItem: analysis, facility, calanderizedMeters: meters,
    accountAnalysisItems: snapshot.facilityAnalyses, accountPredictorEntries: [], accountPredictors: [], calculateAllMonthlyData: false, includeGroupSummaries: true, reportYear: 2023 });
  return { snapshot: { ...snapshot, facilityReports: [report] }, report, facility, analysis, meters, results };
}
