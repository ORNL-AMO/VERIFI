import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { buildFacilityAnalysisGroupModelViews } from './facility-analysis-group-model.view';

describe('buildFacilityAnalysisGroupModelViews', () => {
  it('renders concise generated and user-defined regression equations with significant-digit rounding', () => {
    const analysis = fixture('energy', [
      {
        idbGroupId: 'generated', analysisType: 'regression', isGeneratedModel: true,
        selectedModelId: 'model-a', regressionModelYear: 2024,
        regressionStartYear: 2022, regressionModelStartMonth: 0,
        regressionEndYear: 2024, regressionModelEndMonth: 11,
        predictorVariables: [{ id: 'production', name: 'Production', productionInAnalysis: true }],
        models: [{ modelId: 'model-a', modelYear: 2024, coef: [10.1234567890123, 2.5000000000001], predictorVariables: [{ id: 'production', name: 'Production' }] }]
      },
      {
        idbGroupId: 'custom', analysisType: 'regression', isGeneratedModel: false,
        regressionModelYear: 2023, regressionConstant: 8,
        predictorVariables: [{ id: 'hours', name: 'Hours', productionInAnalysis: true, regressionCoefficient: -1.25 }]
      }
    ]);

    const views = buildFacilityAnalysisGroupModelViews(analysis, [
      { guid: 'generated', name: 'Main process' }, { guid: 'custom', name: 'Support load' }
    ] as any);

    expect(views[0]).toMatchObject({
      name: 'Main process', methodLabel: 'Regression', modelLabel: 'Model year 2024',
      equationLabel: 'Modeled energy = 10.123 + 2.5 × Production', unavailable: false
    });
    expect(views[1]).toMatchObject({
      modelLabel: 'User-defined model · Model year 2023',
      equationLabel: 'Modeled energy = 8 − 1.25 × Hours'
    });
  });

  it('renders method-specific equations and water terminology', () => {
    const views = buildFacilityAnalysisGroupModelViews(fixture('water', [
      { idbGroupId: 'absolute', analysisType: 'absoluteEnergyConsumption', predictorVariables: [] },
      { idbGroupId: 'classic', analysisType: 'energyIntensity', predictorVariables: [{ name: 'Gallons produced', productionInAnalysis: true }] },
      { idbGroupId: 'modified', analysisType: 'modifiedEnergyIntensity', specifiedMonthlyPercentBaseload: false, averagePercentBaseload: 20, predictorVariables: [{ name: 'Units', productionInAnalysis: true }] },
      { idbGroupId: 'monthly', analysisType: 'modifiedEnergyIntensity', specifiedMonthlyPercentBaseload: true, predictorVariables: [] },
      { idbGroupId: 'skipped', analysisType: 'skipAnalysis', predictorVariables: [] }
    ]), []);

    expect(views.map(view => view.methodLabel)).toEqual([
      'Absolute consumption', 'Classic intensity', 'Modified intensity', 'Modified intensity', 'Excluded'
    ]);
    expect(views[0].equationLabel).toBe('Modeled water = baseline-period actual consumption');
    expect(views[1].equationLabel).toBe('Modeled water = baseline intensity × Gallons produced');
    expect(views[2].modelLabel).toContain('20% baseload share');
    expect(views[3].modelLabel).toContain('monthly baseload share');
    expect(views[4]).toMatchObject({ equationLabel: 'No modeled equation is applied.', excluded: true });
  });

  it('marks unfinished regression equations unavailable', () => {
    const [view] = buildFacilityAnalysisGroupModelViews(fixture('energy', [{
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: true,
      regressionConstant: 10, regressionModelYear: 2024,
      predictorVariables: [{ name: 'Production', productionInAnalysis: true, regressionCoefficient: 2 }]
    }]), []);

    expect(view.unavailable).toBe(true);
    expect(view.modelLabel).toBe('Model year not set');
    expect(view.equationLabel).toContain('select a regression model');
  });
});

function fixture(category: 'energy' | 'water', groups: any[]): IdbAnalysisItem {
  return {
    guid: 'analysis-a', analysisCategory: category, baselineYear: 2020, groups
  } as IdbAnalysisItem;
}
