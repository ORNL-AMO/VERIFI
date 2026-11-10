import { defer, Observable, of, timeout } from 'rxjs';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { calculateUserDefinedInspection, UserDefinedInspectionRequest, UserDefinedInspectionResponse } from '@domain/calculations/analysis-calculations/user-defined-inspection-calculation';
export { UserDefinedInspectionRequest, UserDefinedInspectionResponse } from '@domain/calculations/analysis-calculations/user-defined-inspection-calculation';
import { checkTwelveMonthSelection } from '@domain/calculations/status-check-calculations/validation/groupAnalysisValidation';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';

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
        new URL('../../../../../../../../platform/web-workers/user-defined-inspection.worker', import.meta.url)
      ), request);
    }
    return of(calculateUserDefinedInspection(request));
  }).pipe(timeout(CALCULATION_WORKER_TIMEOUT_MS));
}
