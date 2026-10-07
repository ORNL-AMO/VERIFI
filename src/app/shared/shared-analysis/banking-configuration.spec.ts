import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getBankedAnalysisGroup, isBankedGroupConfigurationComplete } from './banking-configuration';

describe('banking configuration', () => {
  const group = (overrides: Partial<AnalysisGroup> = {}): AnalysisGroup => ({
    idbGroupId: 'group-1',
    analysisType: 'absoluteEnergyConsumption',
    applyBanking: true,
    bankedAnalysisYear: 2019,
    newBaselineYear: 2020,
    ...overrides
  } as AnalysisGroup);

  const analysis = (overrides: Partial<IdbAnalysisItem> = {}): IdbAnalysisItem => ({
    guid: 'analysis-1',
    hasBanking: true,
    bankedAnalysisItemId: 'banked-analysis-1',
    groups: [group()],
    ...overrides
  } as IdbAnalysisItem);

  const bankedAnalysis = (overrides: Partial<IdbAnalysisItem> = {}): IdbAnalysisItem => ({
    guid: 'banked-analysis-1',
    groups: [group({ bankedAnalysisYear: undefined, newBaselineYear: undefined })],
    ...overrides
  } as IdbAnalysisItem);

  it('accepts a fully configured group with a matching banked group', () => {
    const selectedGroup = group();
    const selectedAnalysis = analysis({ groups: [selectedGroup] });
    const selectedBankedAnalysis = bankedAnalysis();

    expect(isBankedGroupConfigurationComplete(selectedAnalysis, selectedGroup, selectedBankedAnalysis)).toBe(true);
    expect(getBankedAnalysisGroup(selectedAnalysis, selectedGroup, selectedBankedAnalysis)?.idbGroupId).toBe('group-1');
  });

  it('finds the matching source group before banking is applied', () => {
    const selectedGroup = group({ applyBanking: false });
    const selectedAnalysis = analysis({ groups: [selectedGroup] });
    const selectedBankedAnalysis = bankedAnalysis();

    expect(getBankedAnalysisGroup(selectedAnalysis, selectedGroup, selectedBankedAnalysis)?.idbGroupId).toBe('group-1');
    expect(isBankedGroupConfigurationComplete(selectedAnalysis, selectedGroup, selectedBankedAnalysis)).toBe(false);
  });

  it.each([
    ['missing applied banking year', group({ bankedAnalysisYear: undefined }), bankedAnalysis()],
    ['missing new baseline year', group({ newBaselineYear: undefined }), bankedAnalysis()],
    ['invalid year order', group({ bankedAnalysisYear: 2020, newBaselineYear: 2020 }), bankedAnalysis()],
    ['missing banked group', group(), bankedAnalysis({ groups: [] })],
    ['missing banked analysis', group(), undefined],
    ['skipped banked group', group(), bankedAnalysis({ groups: [group({ analysisType: 'skip' })] })],
    ['banked group configured to skip analysis', group(), bankedAnalysis({ groups: [group({ analysisType: 'skipAnalysis' })] })],
  ])('rejects %s', (_label, selectedGroup, selectedBankedAnalysis) => {
    const selectedAnalysis = analysis({ groups: [selectedGroup] });

    expect(isBankedGroupConfigurationComplete(
      selectedAnalysis,
      selectedGroup,
      selectedBankedAnalysis
    )).toBe(false);
  });
});
