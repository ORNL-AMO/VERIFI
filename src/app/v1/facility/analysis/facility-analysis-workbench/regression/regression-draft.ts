import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FiscalYearSettings, getUserDefinedModelDateRange } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { roundRegressionNumber } from './regression-number-format';

/** Clears every persisted field derived from a generated regression model. */
export function invalidateRegressionModel(group: AnalysisGroup): void {
  group.models = undefined;
  group.selectedModelId = undefined;
  group.dateModelsGenerated = undefined;
  group.regressionModelYear = undefined;
  group.regressionConstant = undefined;
  group.predictorVariables.forEach(variable => { variable.regressionCoefficient = undefined; });
}

export function invalidateAllRegressionModels(analysis: IdbAnalysisItem): void {
  analysis.groups.forEach(invalidateRegressionModel);
  analysis.isAnalysisVisited = false;
}

export function applySelectedRegressionModel(group: AnalysisGroup, model: JStatRegressionModel): AnalysisGroup {
  return {
    ...structuredClone(group),
    selectedModelId: model.modelId,
    regressionConstant: model.coef[0],
    regressionModelYear: model.modelYear,
    models: [structuredClone(model)],
    predictorVariables: group.predictorVariables.map(variable => {
      const index = model.predictorVariables.findIndex(item => item.id === variable.id);
      return { ...variable, regressionCoefficient: index >= 0 ? model.coef[index + 1] : 0 };
    })
  };
}

export function convertRegressionGroupToUserDefined(
  group: AnalysisGroup,
  selectedModel: JStatRegressionModel | undefined,
  facility: FiscalYearSettings | undefined,
  fallbackYear: number | undefined
): AnalysisGroup {
  const modelYear = selectedModel?.modelYear ?? group.regressionModelYear;
  const dateRange = getUserDefinedModelDateRange(modelYear, facility, fallbackYear);
  return {
    ...structuredClone(group),
    isGeneratedModel: false,
    selectedModelId: undefined,
    models: undefined,
    dateModelsGenerated: undefined,
    regressionModelYear: modelYear,
    regressionConstant: roundRegressionNumber(selectedModel?.coef[0] ?? group.regressionConstant),
    ...(dateRange ? {
      regressionModelStartMonth: dateRange.startMonth,
      regressionStartYear: dateRange.startYear,
      regressionModelEndMonth: dateRange.endMonth,
      regressionEndYear: dateRange.endYear
    } : {}),
    predictorVariables: group.predictorVariables.map(variable => {
      const coefficientIndex = selectedModel?.predictorVariables.findIndex(item => item.id === variable.id) ?? -1;
      const coefficient = selectedModel
        ? (coefficientIndex >= 0 ? selectedModel.coef[coefficientIndex + 1] : 0)
        : variable.regressionCoefficient;
      return { ...variable, regressionCoefficient: roundRegressionNumber(coefficient) };
    })
  };
}
