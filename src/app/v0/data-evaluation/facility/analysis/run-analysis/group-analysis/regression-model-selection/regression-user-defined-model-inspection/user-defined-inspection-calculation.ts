import { defer, Observable, of, timeout } from 'rxjs';
import { AnalysisGroup, MonthlyAnalysisSummary } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { MonthlyAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/monthlyAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { checkTwelveMonthSelection } from '@domain/calculations/status-check-calculations/validation/groupAnalysisValidation';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';

export interface UserDefinedInspectionRequest {
  selectedGroup: AnalysisGroup;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  meters: IdbUtilityMeter[];
  meterData: IdbUtilityMeterData[];
  accountPredictorEntries: IdbPredictorData[];
  accountAnalysisItems: IdbAnalysisItem[];
  assessmentReportVersion: AssessmentReportVersion;
}

export interface UserDefinedInspectionResponse {
  error: boolean;
  monthlyAnalysisSummary?: MonthlyAnalysisSummary;
}

/** Only these analysis annotations are unused by the monthly calculation. */
export function inspectionCalculationInputs(request: UserDefinedInspectionRequest): unknown {
  const withoutNotes = (group: AnalysisGroup) => {
    const { regressionModelNotes, ...calculationGroup } = group;
    return calculationGroup;
  };
  const withoutAnnotations = (analysis: IdbAnalysisItem) => {
    const { modifiedDate, isAnalysisVisited, dataCheckedDate, checked, ...calculationAnalysis } = analysis;
    return { ...calculationAnalysis, groups: analysis.groups.map(withoutNotes) };
  };
  return {
    ...request,
    selectedGroup: withoutNotes(request.selectedGroup),
    analysisItem: withoutAnnotations(request.analysisItem),
    accountAnalysisItems: request.accountAnalysisItems.map(withoutAnnotations)
  };
}

export function isCompleteUserDefinedGroup(group: AnalysisGroup): boolean {
  const predictors = group.predictorVariables.filter(variable => variable.productionInAnalysis);
  return !group.isGeneratedModel && Number.isFinite(group.regressionConstant)
    && predictors.length > 0 && predictors.every(variable => Number.isFinite(variable.regressionCoefficient))
    && [group.regressionStartYear, group.regressionModelStartMonth, group.regressionEndYear, group.regressionModelEndMonth].every(Number.isFinite)
    && checkTwelveMonthSelection(group);
}

export function runUserDefinedInspection(request: UserDefinedInspectionRequest): Observable<UserDefinedInspectionResponse> {
  return defer(() => {
    if (typeof Worker !== 'undefined') {
      return runWorker<UserDefinedInspectionResponse>(new Worker(
        new URL('../../../../../../../../platform/web-workers/monthly-group-analysis.worker', import.meta.url)
      ), request);
    }
    const calanderizedMeters = getCalanderizedMeterData(
      request.meters, request.meterData, request.facility, false,
      { energyIsSource: request.analysisItem.energyIsSource, neededUnits: getNeededUnits(request.analysisItem) },
      [], [], [request.facility], request.assessmentReportVersion, []
    );
    const calculation = new MonthlyAnalysisSummaryClass(
      request.selectedGroup, request.analysisItem, request.facility, calanderizedMeters,
      request.accountPredictorEntries, false, request.accountAnalysisItems
    );
    return of({ error: false, monthlyAnalysisSummary: calculation.getResults() });
  }).pipe(timeout(CALCULATION_WORKER_TIMEOUT_MS));
}
