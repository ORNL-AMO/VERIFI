import { AnnualGroupAnalysisSummaryClass } from './annualGroupAnalysisSummaryClass';
import {
  FacilityAnalysisGroupResultsValue,
  FacilityAnalysisGroupResultsWorkerRequest
} from '@platform/web-workers/facility-analysis-group-results-worker.contract';

/** Shared deterministic entry point for selected-group Worker and synchronous execution. */
export function calculateFacilityAnalysisGroupResults(
  request: FacilityAnalysisGroupResultsWorkerRequest
): FacilityAnalysisGroupResultsValue {
  const group = request.analysisItem.groups.find(item => item.idbGroupId === request.groupGuid);
  if (!group) throw new Error('The selected analysis group is no longer available.');

  const calculation = new AnnualGroupAnalysisSummaryClass(
    group,
    request.analysisItem,
    request.facility,
    [...request.calanderizedMeters],
    [...request.accountPredictorEntries],
    undefined,
    [...request.accountPredictors],
    [...request.accountAnalysisItems],
    { reportYear: request.reportYear }
  );
  return {
    itemId: request.analysisItem.guid,
    groupGuid: request.groupGuid,
    group,
    annualAnalysisSummaryData: calculation.getAnnualAnalysisSummaries(),
    monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData,
    reportYear: calculation.reportYear
  };
}
