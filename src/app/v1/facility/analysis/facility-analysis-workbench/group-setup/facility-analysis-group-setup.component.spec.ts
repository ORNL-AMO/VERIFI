import { AnalysisGroup } from '@data/models/analysis';
import { invalidateRegressionModel } from '../regression/regression-draft';

describe('facility analysis group setup behavior', () => {
  it('clears model-derived fields without changing the selected analysis method', () => {
    const group = {
      analysisType: 'regression',
      models: [{ modelId: 'model-a' }],
      selectedModelId: 'model-a',
      dateModelsGenerated: new Date(),
      regressionModelYear: 2024,
      regressionConstant: 10,
      predictorVariables: [{ regressionCoefficient: 2 }]
    } as unknown as AnalysisGroup;

    invalidateRegressionModel(group);

    expect(group.analysisType).toBe('regression');
    expect(group).toMatchObject({
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      regressionModelYear: undefined,
      regressionConstant: undefined
    });
    expect(group.predictorVariables[0].regressionCoefficient).toBeUndefined();
  });
});
