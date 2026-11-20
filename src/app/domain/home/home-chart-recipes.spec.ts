import { buildHomeChart } from './home-chart-recipes';
import { decodeVisualizationDefinition } from '../visualizations/visualization-validation';
import { serializeVisualizationDefinition } from '../visualizations/visualization-source-groups';

describe('shipped Home chart configurations', () => {
  it.each(['energy', 'water'] as const)('builds reproducible owner-bound %s intent without saved identities', category => {
    for (const owner of [{ kind: 'account' as const, guid: 'account' }, { kind: 'facility' as const, guid: 'facility' }]) {
      const ref = { kind: 'built-in' as const, recipe: `reporting-${category}-rolling`, version: 1, owner };
      const built = buildHomeChart(ref, 'account');
      expect(built.state).toBe('ready'); if (built.state !== 'ready') throw new Error();
      expect(decodeVisualizationDefinition(built.definition).state).toBe('valid');
      expect(decodeVisualizationDefinition(serializeVisualizationDefinition(built.definition)).state).toBe('valid');
      expect(built.definition.sources[0]).toMatchObject({ measure: 'rolling-improvement', reporting: { owner, category } });
      expect(built.definition.sources[0]).not.toHaveProperty('analysisGuid');
      expect(built.definition.facilitySelection).toEqual(owner.kind === 'account' ? { kind: 'all' } : { kind: 'fixed', facilityGuids: ['facility'] });
      expect(buildHomeChart(ref, 'account')).toEqual(built);
    }
  });
  it('preserves unknown recipe/version intent as unsupported instead of substituting a current chart', () => {
    const ref = { kind: 'built-in' as const, recipe: 'reporting-energy-rolling', version: 2, owner: { kind: 'account' as const, guid: 'account' } };
    expect(buildHomeChart(ref, 'account').state).toBe('unsupported');
    expect(buildHomeChart({ ...ref, version: 1, recipe: 'new' }, 'account').state).toBe('unsupported');
    expect(buildHomeChart({ ...ref, version: 1 }, 'foreign').state).toBe('unsupported');
  });
});
