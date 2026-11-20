import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';

/** Detached calculation inputs for the model currently being reviewed or reported. */
export function groupWithGeneratedModel(group: AnalysisGroup, model: JStatRegressionModel): AnalysisGroup {
  const clone = structuredClone(group);
  clone.regressionConstant = model.coef[0];
  clone.regressionModelYear = model.modelYear;
  clone.selectedModelId = model.modelId;
  clone.models = [structuredClone(model)];
  clone.predictorVariables = clone.predictorVariables.map(variable => {
    const index = model.predictorVariables.findIndex(item => item.id === variable.id);
    return { ...variable, productionInAnalysis: index >= 0,
      regressionCoefficient: index >= 0 ? model.coef[index + 1] : undefined };
  });
  return clone;
}
