import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { convertOrphanedGeneratedModelToUserDefined, getSelectedRegressionModel } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { buildUserDefinedRegressionModel } from '@shared/shared-analysis/calculations/regression-models-calculation';
import { RegressionModelsCalculator } from '@shared/shared-analysis/calculations/regression-models-calculator';
import { AnalysisReportInputs, assertAnalysisReportYears } from './analysis-report-inputs';

export interface AnalysisDataCheckGroup {
  readonly facilityGuid: string;
  readonly analysisGuid: string;
  readonly facilityName: string;
  readonly baselineYear: number;
  readonly group: AnalysisGroup;
  readonly model?: JStatRegressionModel;
  readonly critical: readonly string[];
  readonly moderate: readonly string[];
  readonly minor: readonly string[];
}
export interface AnalysisDataChecks {
  readonly reportYear: number;
  readonly groups: readonly AnalysisDataCheckGroup[];
  readonly hasBlockingErrors: boolean;
}

/** Use the same model validation as v0, on detached inputs and at the requested year. */
export function calculateAnalysisDataChecks(inputs: AnalysisReportInputs, reportYear: number): AnalysisDataChecks {
  assertAnalysisReportYears(inputs, [reportYear]);
  const detached = structuredClone(inputs);
  const groups: AnalysisDataCheckGroup[] = [];
  for (const link of detached.analysis.facilityAnalysisItems) {
    if (!link.analysisItemId || link.analysisItemId === 'skip') continue;
    const analysis = detached.facilityAnalyses.find(item => item.guid === link.analysisItemId && item.facilityId === link.facilityId)!;
    const facility = detached.facilities.find(item => item.guid === link.facilityId)!;
    const data = detached.predictorData.filter(item => item.facilityId === facility.guid);
    for (let group of analysis.groups) {
      if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') continue;
      let model: JStatRegressionModel | undefined;
      let modelFailure: string | undefined;
      if (group.analysisType === 'regression') {
        try {
          if (group.selectedModelId) {
            model = getSelectedRegressionModel(group);
            if (model) {
              // Match v0's read-time repair of old imported predictor IDs without persisting it.
              model.predictorVariables.forEach(variable => {
                if (!group.predictorVariables.some(candidate => candidate.id === variable.id)) {
                  const match = group.predictorVariables.find(candidate => candidate.name === variable.name);
                  if (match) variable.id = match.id;
                }
              });
              model = new RegressionModelsCalculator([...data]).setModelVaildAndNotes(model, reportYear, facility, analysis.baselineYear, group);
            }
          }
          if (!model && group.isGeneratedModel && group.selectedModelId) {
            group = convertOrphanedGeneratedModelToUserDefined(group, facility, analysis.baselineYear);
          }
          if (!model && !group.isGeneratedModel) model = buildUserDefinedRegressionModel(group, facility, analysis, reportYear, data);
          if (model?.errorModeling) { model = undefined; modelFailure = 'The saved regression model could not be calculated. Review the model setup.'; }
        } catch {
          model = undefined;
          modelFailure = 'The saved regression model is incomplete or invalid. Review the model setup.';
        }
      }
      const regression = group.analysisType === 'regression';
      const critical = regression ? !model ? [modelFailure ?? 'Select an available regression model in the analysis.']
        : !model.isValid ? nonblank(model.modelValidationNotes, 'The regression model is invalid.') : [] : [];
      groups.push({ facilityGuid: facility.guid, analysisGuid: analysis.guid, facilityName: facility.name,
        baselineYear: analysis.baselineYear, group, model, critical,
        moderate: model && !model.SEPValidationPass ? nonblank(model.dataValidationNotes) : [],
        minor: model ? nonblank(model.modelNotes) : [] });
    }
  }
  return { reportYear, groups, hasBlockingErrors: groups.some(group => group.critical.length > 0) || groups.length === 0 };
}

function nonblank(notes: readonly string[] | undefined, fallback?: string): string[] {
  const result = (notes ?? []).filter(note => !!note?.trim());
  return result.length ? result : fallback ? [fallback] : [];
}
