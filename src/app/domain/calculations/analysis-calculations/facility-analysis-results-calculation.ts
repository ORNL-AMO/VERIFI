import { AnnualFacilityAnalysisSummaryClass } from './annualFacilityAnalysisSummaryClass';
import {
  FacilityAnalysisResultsValue,
  FacilityAnalysisResultsWorkerRequest
} from '@platform/web-workers/facility-analysis-results-worker.contract';

/** Shared deterministic entry point for v1 Worker and synchronous execution. */
export function calculateFacilityAnalysisResults(
  request: FacilityAnalysisResultsWorkerRequest
): FacilityAnalysisResultsValue {
  const calculation = new AnnualFacilityAnalysisSummaryClass(
    request.analysisItem,
    request.facility,
    [...request.calanderizedMeters],
    [...request.accountPredictorEntries],
    request.calculateAllMonthlyData,
    [...request.accountPredictors],
    [...request.accountAnalysisItems],
    request.includeGroupSummaries,
    { reportYear: request.reportYear }
  );
  return {
    itemId: request.analysisItem.guid,
    annualAnalysisSummaries: calculation.getAnnualAnalysisSummaries(),
    monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData,
    groupSummaries: calculation.groupSummaries,
    reportYear: calculation.reportYear
  };
}
