import { getNewAnalysisGroup } from './analysisItem';

describe('getNewAnalysisGroup', () => {
  it('does not enable banking before its required years are configured', () => {
    const group = getNewAnalysisGroup('group-1', []);

    expect(group.applyBanking).toBe(false);
    expect(group.bankedAnalysisYear).toBeUndefined();
    expect(group.newBaselineYear).toBeUndefined();
  });
});
