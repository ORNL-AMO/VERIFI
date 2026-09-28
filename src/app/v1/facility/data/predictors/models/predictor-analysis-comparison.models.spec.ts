import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { analysisGroupsEqualByGuid, changedAnalysesByGuid } from './predictor-analysis-comparison.models';

describe('predictor analysis comparison', () => {
  it('ignores reordered analyses and reordered groups', () => {
    const energy = analysis('energy-analysis', [group('electricity'), group('natural-gas')]);
    const water = analysis('water-analysis', [group('water')]);
    const reorderedEnergy = analysis('energy-analysis', [group('natural-gas'), group('electricity')]);

    expect(analysisGroupsEqualByGuid(energy.groups, reorderedEnergy.groups)).toBe(true);
    expect(changedAnalysesByGuid([energy, water], [water, reorderedEnergy])).toEqual([]);
  });

  it('returns only the analysis containing a changed group', () => {
    const current = analysis('energy-analysis', [group('electricity')]);
    const proposed = analysis('energy-analysis', [{
      ...group('electricity'),
      maxModelVariables: 6
    }]);

    expect(changedAnalysesByGuid([current], [proposed])).toEqual([proposed]);
  });
});

function analysis(guid: string, groups: AnalysisGroup[]): IdbAnalysisItem {
  return { guid, groups } as IdbAnalysisItem;
}

function group(idbGroupId: string): AnalysisGroup {
  return {
    idbGroupId,
    analysisType: 'regression',
    predictorVariables: [],
    monthlyPercentBaseload: [],
    dataAdjustments: [],
    baselineAdjustmentsV2: [],
    isGeneratedModel: true,
    maxModelVariables: 4,
    applyBanking: true
  } as AnalysisGroup;
}
