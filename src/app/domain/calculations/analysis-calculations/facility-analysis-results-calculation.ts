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

/** Dashboard projection that preserves the shared calculation while bounding its returned result payload. */
export function calculateFacilityAnalysisOutcomeResults(
  request: FacilityAnalysisResultsWorkerRequest
): FacilityAnalysisResultsValue {
  return projectFacilityAnalysisOutcomeResults(calculateFacilityAnalysisResults({
    ...request,
    includeGroupSummaries: false
  }));
}

export function projectFacilityAnalysisOutcomeResults(
  value: FacilityAnalysisResultsValue
): FacilityAnalysisResultsValue {
  const annual = value.annualAnalysisSummaries.filter(row =>
    Number.isFinite(row.year)
    && (value.reportYear === undefined || row.year <= value.reportYear)
  );
  let monthly: FacilityAnalysisResultsValue['monthlyAnalysisSummaryData'][number] | undefined;
  let latestMonthlyTime = Number.NEGATIVE_INFINITY;
  value.monthlyAnalysisSummaryData.forEach(row => {
    const time = new Date(row.date).getTime();
    if (Number.isFinite(time) && time > latestMonthlyTime) {
      latestMonthlyTime = time;
      monthly = row;
    }
  });
  return {
    ...value,
    annualAnalysisSummaries: annual,
    monthlyAnalysisSummaryData: monthly ? [monthly] : [],
    groupSummaries: []
  };
}
