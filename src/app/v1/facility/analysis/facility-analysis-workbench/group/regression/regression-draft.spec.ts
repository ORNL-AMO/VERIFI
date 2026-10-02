import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import {
  applySelectedRegressionModel,
  convertRegressionGroupToUserDefined,
  invalidateAllRegressionModels,
  invalidateRegressionModel
} from './regression-draft';

describe('regression draft transitions', () => {
  it('clears every generated-model field together', () => {
    const group = populatedGroup();

    invalidateRegressionModel(group);

    expect(group).toMatchObject({
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      regressionModelYear: undefined,
      regressionConstant: undefined,
      predictorVariables: [{ regressionCoefficient: undefined }]
    });
  });

  it('invalidates every group and marks the analysis unvisited', () => {
    const analysis = { groups: [populatedGroup(), populatedGroup()], isAnalysisVisited: true } as IdbAnalysisItem;

    invalidateAllRegressionModels(analysis);

    expect(analysis.isAnalysisVisited).toBe(false);
    expect(analysis.groups.every(group => group.models === undefined && group.regressionConstant === undefined)).toBe(true);
  });

  it('applies the selected equation without mutating the source group', () => {
    const group = populatedGroup();
    const model = {
      modelId: 'model-2', modelYear: 2024, coef: [10, 2],
      predictorVariables: [{ id: 'predictor-1' }]
    } as JStatRegressionModel;

    const result = applySelectedRegressionModel(group, model);

    expect(result).toMatchObject({ selectedModelId: 'model-2', regressionConstant: 10, regressionModelYear: 2024 });
    expect(result.predictorVariables[0].regressionCoefficient).toBe(2);
    expect(group.selectedModelId).toBe('model-1');
  });

  it('converts a selected generated equation to a rounded user-defined model', () => {
    const group = populatedGroup();
    const selected = {
      modelId: 'model-1', modelYear: 2024, coef: [17485.54321, -6.8489342],
      predictorVariables: [{ id: 'predictor-1' }]
    } as JStatRegressionModel;

    const result = convertRegressionGroupToUserDefined(
      group,
      selected,
      { fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true },
      2022
    );

    expect(result).toMatchObject({
      isGeneratedModel: false,
      selectedModelId: undefined,
      models: undefined,
      regressionConstant: 17486,
      regressionModelStartMonth: 0,
      regressionStartYear: 2024,
      regressionModelEndMonth: 11,
      regressionEndYear: 2024
    });
    expect(result.predictorVariables[0].regressionCoefficient).toBe(-6.8489);
  });
});

function populatedGroup(): AnalysisGroup {
  return {
    idbGroupId: 'group-1',
    models: [{ modelId: 'model-1' } as JStatRegressionModel],
    selectedModelId: 'model-1',
    dateModelsGenerated: new Date(),
    regressionModelYear: 2023,
    regressionConstant: 5,
    predictorVariables: [{ id: 'predictor-1', regressionCoefficient: 3 }]
  } as AnalysisGroup;
}
