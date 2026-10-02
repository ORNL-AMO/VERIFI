import { MonthlyAnalysisSummaryClass } from './monthlyAnalysisSummaryClass';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getLatestCompleteAnalysisYear } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import {
  RegressionValidationValue,
  RegressionValidationWorkerRequest
} from '@platform/web-workers/regression-validation-worker.contract';
import { buildUserDefinedRegressionModel } from '@shared/shared-analysis/calculations/regression-models-calculation';

/** Calendarizes once and calculates the primary and optional comparison series together. */
export function calculateRegressionValidation(
  request: RegressionValidationWorkerRequest
): RegressionValidationValue {
  const calanderizedMeters = getCalanderizedMeterData(
    [...request.meters],
    [...request.meterData],
    request.facility,
    false,
    { energyIsSource: request.analysisItem.energyIsSource, neededUnits: getNeededUnits(request.analysisItem) },
    [],
    [],
    [request.facility],
    request.assessmentReportVersion,
    []
  );
  const reportYear = getLatestCompleteAnalysisYear(
    [request.group],
    calanderizedMeters,
    [...request.facilityPredictorData],
    [request.facility]
  );
  const modelAnalysis = structuredClone(request.analysisItem);
  if (request.source === 'user-defined') modelAnalysis.baselineYear = request.group.regressionStartYear;
  const model = request.model ?? buildUserDefinedRegressionModel(
    request.group,
    request.facility,
    modelAnalysis,
    reportYear,
    request.facilityPredictorData
  );
  const monthly = monthlySeries(request.group, request, calanderizedMeters, reportYear);
  const comparison = request.comparison
    ? {
      model: request.comparison.model,
      monthly: monthlySeries(request.comparison.group, request, calanderizedMeters, reportYear)
    }
    : undefined;
  return { reportYear, model, monthly, comparison };
}

function monthlySeries(
  group: RegressionValidationWorkerRequest['group'],
  request: RegressionValidationWorkerRequest,
  calanderizedMeters: readonly CalanderizedMeter[],
  reportYear: number
) {
  return new MonthlyAnalysisSummaryClass(
    group,
    request.analysisItem,
    request.facility,
    [...calanderizedMeters],
    [...request.accountPredictorEntries],
    false,
    [...request.accountAnalysisItems],
    { reportYear }
  ).getResults().monthlyAnalysisSummaryData;
}
