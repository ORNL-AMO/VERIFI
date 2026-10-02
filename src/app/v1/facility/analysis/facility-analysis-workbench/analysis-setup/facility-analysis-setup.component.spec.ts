import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { compatibleBankingSources } from './facility-analysis-setup.component';
import { invalidateAllRegressionModels } from '../regression/regression-draft';

describe('facility analysis setup behavior', () => {
  it('clears every persisted regression selection before unlocking setup', () => {
    const analysis = {
      isAnalysisVisited: true,
      groups: [{
        models: [{ modelId: 'model-a' }], selectedModelId: 'model-a', dateModelsGenerated: new Date(),
        regressionConstant: 2, regressionModelYear: 2024,
        predictorVariables: [{ regressionCoefficient: 3 }]
      } as unknown as AnalysisGroup]
    } as IdbAnalysisItem;

    invalidateAllRegressionModels(analysis);

    expect(analysis.groups[0]).toMatchObject({
      models: undefined, selectedModelId: undefined, dateModelsGenerated: undefined,
      regressionConstant: undefined, regressionModelYear: undefined
    });
    expect(analysis.groups[0].predictorVariables[0].regressionCoefficient).toBeUndefined();
    expect(analysis.isAnalysisVisited).toBe(false);
  });

  it('offers only same-facility analyses with a compatible category and basis', () => {
    const analysis = { guid: 'current', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: true } as IdbAnalysisItem;
    const candidates = [
      analysis,
      { guid: 'match', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: true },
      { guid: 'site', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: false },
      { guid: 'water', facilityId: 'facility-a', analysisCategory: 'water', energyIsSource: true },
      { guid: 'other-facility', facilityId: 'facility-b', analysisCategory: 'energy', energyIsSource: true }
    ] as IdbAnalysisItem[];
    expect(compatibleBankingSources(analysis, candidates).map(item => item.guid)).toEqual(['match']);
  });
});
