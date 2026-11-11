import { checkVisualizationCompatibility } from './visualization-capabilities';
import { visualizationEvidenceFixture } from './testing/visualization-provider-fixtures';
import { decodeVisualizationDefinition } from './visualization-validation';
import { analysisVisualizationFixture, energyUseVisualizationFixture, utilityVisualizationFixture } from './testing/visualization-fixtures';
import { VisualizationDefinition } from './visualization-definition';
import { remapVisualizationDefinition, visualizationReferenceKey, visualizationReferences } from './visualization-references';

describe('saved visualization reference mapping', () => {
  it('maps scope, rules, selections and selected series without changing local IDs or source input', () => {
    const original: VisualizationDefinition = { ...energyUseVisualizationFixture(), sources: [
      { id: 'equipment', kind: 'energy-use', measure: 'consumption', aggregation: 'sum', denominator: 'facility',
        selection: { kind: 'rule', resource: 'equipment', filter: { facilityGuids: ['facility-a'], groupGuids: ['energy-group'], utilitySources: ['Electricity'], search: 'pump' } } },
      { id: 'fixed', kind: 'energy-use', measure: 'consumption', aggregation: 'sum', denominator: 'selected',
        selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a'] } }
    ], series: [{ id: 'item', sourceId: 'fixed', metric: 'consumption', resourceGuid: 'equipment-a', axis: 'left' }] };
    const before = structuredClone(original);
    const result = remapVisualizationDefinition(original, 'account-b', { facility: { 'facility-a': 'facility-b' },
      'energy-use-group': { 'energy-group': 'energy-group-b' }, equipment: { 'equipment-a': 'equipment-b' } });
    expect(result.issues).toEqual([]);
    expect(visualizationReferences(result.definition).map(ref => ref.guid)).toEqual([
      'facility-b', 'facility-b', 'energy-group-b', 'equipment-b', 'equipment-b'
    ]);
    expect(result.definition.series[0]).toEqual({ ...original.series[0], resourceGuid: 'equipment-b' });
    expect(result.definition.sources.map(source => source.id)).toEqual(['equipment', 'fixed']);
    expect(original).toEqual(before);
  });

  it.each(['meter', 'meter-group', 'predictor', 'facility', 'equipment', 'energy-use-group'] as const)(
    'maps fixed %s references', resource => {
      const original: VisualizationDefinition = { ...utilityVisualizationFixture(), sources: [
        { id: 'fixed', kind: 'utility', measure: 'energy', aggregation: 'sum', dataMode: 'calendarized', groupBy: 'total',
          selection: { kind: 'fixed', resource, guids: ['old'] } }
      ], series: [] };
      const result = remapVisualizationDefinition(original, 'new-account', { [resource]: { old: 'new' } });
      expect(result.issues).toEqual([]);
      expect(visualizationReferences(result.definition)[0].guid).toBe('new');
    });

  it('requires owner-scoped mappings for pinned models and comparison models', () => {
    const original = analysisVisualizationFixture(true);
    const modelKeys = visualizationReferences(original).filter(ref => ref.kind === 'model');
    expect(modelKeys.map(visualizationReferenceKey)).toEqual(['["analysis-a","group-a","model-a"]', '["analysis-a","group-a","model-b"]']);
    const result = remapVisualizationDefinition(original, 'account-b', {
      facility: { 'facility-a': 'facility-b' }, analysis: { 'analysis-a': 'analysis-b' }, 'meter-group': { 'group-a': 'group-b' },
      model: Object.fromEntries(modelKeys.map(ref => [visualizationReferenceKey(ref), ref.guid]))
    });
    expect(result.issues).toEqual([]);
    expect(result.definition.sources[0]).toEqual({ ...original.sources[0], analysisGuid: 'analysis-b', groupGuid: 'group-b' });
  });

  it('qualifies charge identity with its owning meter', () => {
    const original: VisualizationDefinition = { ...utilityVisualizationFixture(), sources: [{ id: 'charge', kind: 'utility',
      measure: 'charge', aggregation: 'none', dataMode: 'billing-period', groupBy: 'meter',
      charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'cost' } }], series: [] };
    const result = remapVisualizationDefinition(original, 'account-b', { meter: { 'meter-a': 'meter-b' }, charge: { '["meter-a","charge-a"]': 'charge-a' } });
    expect(result.issues).toEqual([]);
    expect(result.definition.sources[0]).toMatchObject({ charge: { meterGuid: 'meter-b', chargeGuid: 'charge-a' } });
  });

  it('never reconnects a previously blocked reference on a subsequent transfer', () => {
    const first = remapVisualizationDefinition(utilityVisualizationFixture(), 'account-b', {});
    expect(first.issues).toHaveLength(2);
    const second = remapVisualizationDefinition(first.definition, 'account-c', { meter: { 'meter-a': 'unrelated-meter' } }, first.issues);
    expect(second.issues).toEqual(first.issues);
    expect(second.definition.series[0].resourceGuid).toBe('meter-a');
  });

  it('does not use inherited object properties as transfer mappings', () => {
    const original = { ...utilityVisualizationFixture(), series: [] };
    const source = original.sources[0];
    if ('selection' in source) original.sources = [{ ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['toString'] } }];
    const result = remapVisualizationDefinition(original, 'account-b', { meter: {} });
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].guid).toBe('toString');
  });

  it('uses the Energy Use source namespace for rule groups even when selecting facilities', () => {
    const base = energyUseVisualizationFixture();
    const original: VisualizationDefinition = { ...base, sources: [{ id: 'equipment', kind: 'energy-use', measure: 'consumption',
      aggregation: 'sum', denominator: 'facility', selection: { kind: 'rule', resource: 'facility',
        filter: { facilityGuids: ['facility-a'], groupGuids: ['energy-group-a'] } } }] };
    expect(decodeVisualizationDefinition(original).state).toBe('valid');
    expect(checkVisualizationCompatibility(original, [visualizationEvidenceFixture(original)]).state).toBe('compatible');
    const mapped = remapVisualizationDefinition(original, 'account-b', { facility: { 'facility-a': 'facility-b' },
      'energy-use-group': { 'energy-group-a': 'energy-group-b' } });
    expect(mapped.issues).toEqual([]);
    expect(visualizationReferences(mapped.definition)).toContainEqual({ path: 'sources.0.selection.filter.groupGuids.0',
      kind: 'energy-use-group', guid: 'energy-group-b' });
  });

  it.each(['analysis-a', 'group-a', 'model-a', 'model-b', 'facility-a'])(
    'retains the declared analysis-series namespace for %s', guid => {
      const base = analysisVisualizationFixture(true);
      const original: VisualizationDefinition = { ...base, series: [{ ...base.series[0], resourceGuid: guid }] };
      expect(decodeVisualizationDefinition(original).state).toBe('valid');
      expect(checkVisualizationCompatibility(original, [visualizationEvidenceFixture(original)]).state).toBe('compatible');
      const result = remapVisualizationDefinition(original, 'account-b', { facility: { 'facility-a': 'facility-b' },
        analysis: { 'analysis-a': 'analysis-b' }, 'meter-group': { 'group-a': 'group-b' },
        model: { '["analysis-a","group-a","model-a"]': 'model-a', '["analysis-a","group-a","model-b"]': 'model-b' } });
      expect(result.issues).toEqual([]);
      expect(result.definition.series[0].resourceGuid).toBe(
        ({ 'analysis-a': 'analysis-b', 'group-a': 'group-b', 'facility-a': 'facility-b' })[guid] ?? guid);
      const series = visualizationReferences(original).find(ref => ref.path === 'series.0.resourceGuid')!;
      if (guid.startsWith('model-')) expect(series).toMatchObject({ kind: 'model', parentGuid: 'analysis-a', groupGuid: 'group-a' });
    });

  it('keeps analysis-series identities unclassified when the saved intent cannot distinguish a facility from a group', () => {
    const base = analysisVisualizationFixture();
    const original = { ...base, series: [{ ...base.series[0], resourceGuid: 'ambiguous' }] };
    const refs = visualizationReferences(original);
    expect(refs.find(ref => ref.path === 'series.0.resourceGuid')?.kind).toBe('unknown');
  });
});
