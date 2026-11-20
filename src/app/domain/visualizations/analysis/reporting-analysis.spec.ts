import { getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { buildHomeChart } from '../../home/home-chart-recipes';
import { analysisFixture, analysisDefinition } from '../testing/analysis-fixtures';
import { resolveReportingAnalysis, resolveReportingVisualization } from './reporting-analysis';

describe('Active for reporting request resolution', () => {
  const snapshot = () => analysisFixture().snapshot;
  it.each(['energy', 'water'] as const)('resolves only committed exact owner/category selections for %s', category => {
    const data = snapshot(), facility = data.facilities[0];
    const analysis = { ...getNewIdbAnalysisItem(data.account, facility, [], [], category), guid: 'selected' };
    const accountAnalysis = { ...getNewIdbAccountAnalysisItem(category, data.account, data.facilities as any), guid: 'account-selected' };
    const field = category === 'energy' ? 'selectedEnergyAnalysisId' : 'selectedWaterAnalysisId';
    const committed = { ...data, account: { ...data.account, [field]: accountAnalysis.guid },
      facilities: [{ ...facility, [field]: analysis.guid }], facilityAnalyses: [analysis], accountAnalyses: [accountAnalysis] };
    for (const owner of [{ kind: 'account' as const, guid: data.account.guid }, { kind: 'facility' as const, guid: facility.guid }]) {
      const rule = { kind: 'reporting' as const, owner, category };
      const result = resolveReportingAnalysis(rule, committed);
      expect(result).toMatchObject({ state: 'ready', analysis: { guid: owner.kind === 'account' ? accountAnalysis.guid : analysis.guid } });
      const missing = { ...committed, account: { ...committed.account, [field]: undefined }, facilities: [{ ...facility, [field]: undefined }] };
      expect(resolveReportingAnalysis(rule, missing).state).toBe('setup-required');
      const wrongCategory = { ...committed, facilityAnalyses: [{ ...analysis, analysisCategory: category === 'energy' ? 'water' as const : 'energy' as const }],
        accountAnalyses: [{ ...accountAnalysis, analysisCategory: category === 'energy' ? 'water' as const : 'energy' as const }] };
      expect(resolveReportingAnalysis(rule, wrongCategory).state).toBe('missing-source');
    }
  });
  it('keeps exact analyses pinned and follows selection changes without changing the saved rule', () => {
    const data = snapshot(), owner = { kind: 'facility' as const, guid: data.facilities[0].guid };
    const built = buildHomeChart({ kind: 'built-in', owner, recipe: 'reporting-energy-rolling', version: 1 }, data.account.guid);
    if (built.state !== 'ready') throw new Error();
    const before = structuredClone(built.definition), first = data.facilityAnalyses[0];
    for (const guid of [first.guid, 'next']) {
      const current = { ...data, facilities: [{ ...data.facilities[0], selectedEnergyAnalysisId: guid }], facilityAnalyses: [first, { ...first, guid: 'next' }] };
      const resolved = resolveReportingVisualization(built.definition, current);
      expect(resolved).toMatchObject({ state: 'ready', definition: { sources: [{ analysisGuid: guid }] } });
      const exact = analysisDefinition();
      expect(resolveReportingVisualization(exact, current)).toMatchObject({ state: 'ready', definition: exact });
    }
    expect(built.definition).toEqual(before);
    expect(resolveReportingAnalysis({ kind: 'reporting', owner: { kind: 'facility', guid: 'foreign' }, category: 'energy' }, data).state).toBe('missing-source');
  });
});
