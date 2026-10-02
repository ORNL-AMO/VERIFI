import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { groupWithGeneratedModel, modelPeriodMonthCount, userDefinedValidationMessage, validationAnalysisCopies } from './regression-model-validation.service';

describe('regression model validation helpers', () => {
  const validGroup = {
    regressionConstant: 10,
    regressionModelStartMonth: 0,
    regressionStartYear: 2024,
    regressionModelEndMonth: 11,
    regressionEndYear: 2024,
    predictorVariables: [
      { id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: 2 },
      { id: 'weather', name: 'Weather', productionInAnalysis: false }
    ]
  } as AnalysisGroup;

  it('requires a complete equation and at least twelve inclusive months', () => {
    expect(userDefinedValidationMessage(validGroup)).toBeUndefined();
    expect(modelPeriodMonthCount(validGroup)).toBe(12);
    expect(userDefinedValidationMessage({ ...validGroup, regressionModelEndMonth: 9 })).toBe('Select at least 12 complete months.');
    expect(userDefinedValidationMessage({ ...validGroup, regressionConstant: undefined })).toBe('Enter the regression constant.');
  });

  it('builds a candidate group without mutating the saved group', () => {
    const model = {
      modelId: 'model-a', modelYear: 2024, coef: [5, 3],
      predictorVariables: [{ id: 'weather', name: 'Weather' }]
    } as JStatRegressionModel;
    const candidate = groupWithGeneratedModel(validGroup, model);

    expect(candidate).not.toBe(validGroup);
    expect(candidate.selectedModelId).toBe('model-a');
    expect(candidate.regressionConstant).toBe(5);
    expect(candidate.predictorVariables).toEqual([
      expect.objectContaining({ id: 'production', productionInAnalysis: false, regressionCoefficient: undefined }),
      expect.objectContaining({ id: 'weather', productionInAnalysis: true, regressionCoefficient: 3 })
    ]);
    expect(validGroup.predictorVariables[0].productionInAnalysis).toBe(true);
  });

  it('keeps the analysis baseline for the chart while fitting a user-defined model to its selected period', () => {
    const analysis = { baselineYear: 2022 } as IdbAnalysisItem;
    const copies = validationAnalysisCopies(analysis, 'user-defined', validGroup);

    expect(copies.chartAnalysis.baselineYear).toBe(2022);
    expect(copies.modelAnalysis.baselineYear).toBe(2024);
    expect(analysis.baselineYear).toBe(2022);
  });
});
