import { AnnualAccountAnalysisSummaryClass } from './annualAccountAnalysisSummaryClass';
import {
  AccountAnalysisResultsValue,
  AccountAnalysisResultsWorkerRequest
} from '@platform/web-workers/account-analysis-results-worker.contract';

/** Deterministic account-analysis entry point shared by Workers and synchronous execution. */
export function calculateAccountAnalysisResults(
  request: AccountAnalysisResultsWorkerRequest
): AccountAnalysisResultsValue {
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

/** Bounds the dashboard payload without changing calculation precision. */
export function calculateAccountAnalysisDashboardResults(
  request: AccountAnalysisResultsWorkerRequest
): AccountAnalysisResultsValue {
  return projectAccountAnalysisDashboardResults(calculateAccountAnalysisResults(request));
}

export function projectAccountAnalysisDashboardResults(
  value: AccountAnalysisResultsValue
): AccountAnalysisResultsValue {
  const { facilitySummaries: _facilitySummaries, ...dashboardValue } = value;
  const annualAnalysisSummaries = value.annualAnalysisSummaries.filter(row =>
    Number.isFinite(row.year) && (value.reportYear === undefined || row.year <= value.reportYear)
  );
  const monthlyAnalysisSummaryData = [...value.monthlyAnalysisSummaryData]
    .filter(row => Number.isFinite(new Date(row.date).getTime()))
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 1);
  return { ...dashboardValue, annualAnalysisSummaries, monthlyAnalysisSummaryData };
}
