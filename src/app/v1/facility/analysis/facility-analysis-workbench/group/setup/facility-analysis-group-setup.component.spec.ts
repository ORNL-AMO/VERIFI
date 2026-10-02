import { AnalysisGroup } from '@data/models/analysis';
import { invalidateRegressionModel } from '../regression/regression-draft';
import { groupSetupDraftValid } from './facility-analysis-group-setup.facade';

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

  it('validates all group setup fields after each edit', () => {
    const group = {
      analysisType: 'modifiedEnergyIntensity',
      predictorVariables: [{ productionInAnalysis: true }],
      specifiedMonthlyPercentBaseload: false,
      averagePercentBaseload: undefined,
      dataAdjustments: [{ year: 2024, amount: 10 }],
      baselineAdjustmentsV2: [],
      applyBanking: false
    } as AnalysisGroup;

    expect(groupSetupDraftValid(group, false)).toBe(false);
    group.averagePercentBaseload = 15;
    expect(groupSetupDraftValid(group, false)).toBe(true);
    group.applyBanking = true;
    expect(groupSetupDraftValid(group, true)).toBe(false);
    group.bankedAnalysisYear = 2024;
    group.newBaselineYear = 2025;
    expect(groupSetupDraftValid(group, true)).toBe(true);
  });
});
