import { resolveVisualizationSeries } from './visualization-series';
import { checkVisualizationCompatibility } from './visualization-capabilities';
import { visualizationEvidenceFixture } from './testing/visualization-provider-fixtures';
import { decodeVisualizationDefinition } from './visualization-validation';
import { analysisVisualizationFixture, energyUseVisualizationFixture, utilityVisualizationFixture } from './testing/visualization-fixtures';
import { VisualizationDefinition } from './visualization-definition';
import { remapVisualizationDefinition, visualizationReferenceKey, visualizationReferences } from './visualization-references';

describe('saved visualization reference mapping', () => {
  it('preserves the resource namespace declared by a legacy grouping even when the configuration is unavailable', () => {
    const base = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...base, sources: base.sources.map(source => source.kind === 'utility'
      ? { ...source, aggregation: 'none', groupBy: 'group' } : source), series: [{ ...base.series[0], resourceGuid: 'group-a' }] };
    const mapped = remapVisualizationDefinition(definition, 'account-b', { meter: { 'meter-a': 'meter-b' }, 'meter-group': { 'group-a': 'group-b' } });
    expect(mapped.issues).toEqual([]); expect(mapped.definition.series[0].resourceGuid).toBe('group-b');
  });
  it('maps display overrides and preserves unmapped overrides dormant across repeated account transfers', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const original = { ...base, series: [{ ...wildcard, overrides: [
      { resourceGuid: 'meter-a', visible: false }, { resourceGuid: 'old-meter', color: '#123456' }
    ] }] };
    const first = remapVisualizationDefinition(original, 'account-b', { meter: { 'meter-a': 'meter-b' } });
    expect(first.issues).toEqual([]);
    expect(first.definition.series[0].overrides).toEqual([
      { resourceGuid: 'meter-b', visible: false, accountGuid: 'account-b' },
      { resourceGuid: 'old-meter', color: '#123456', accountGuid: 'account-a' }
    ]);
    const second = remapVisualizationDefinition(first.definition, 'account-c', { meter: {
      'meter-b': 'meter-c', 'old-meter': 'unrelated-meter'
    } });
    expect(second.issues).toEqual([]);
    expect(second.definition.series[0].overrides).toEqual([
      { resourceGuid: 'meter-c', visible: false, accountGuid: 'account-c' },
      { resourceGuid: 'old-meter', color: '#123456', accountGuid: 'account-a' }
    ]);
    expect(original.series[0].overrides[0].resourceGuid).toBe('meter-a');
  });

  it('copies provider-local category appearances without treating their identities as domain references', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const original: VisualizationDefinition = { ...base, series: [{ ...wildcard, overrides: [
      { seriesId: 'utility:source:Electricity', visible: false, color: '#123456' },
      { seriesId: 'utility:source:Water', accountGuid: 'foreign-account', label: 'Dormant' },
      { resourceGuid: 'old-meter', visible: false }
    ] }] };
    expect(visualizationReferences(original).filter(ref => ref.optional).map(ref => ref.guid)).toEqual(['old-meter']);
    const first = remapVisualizationDefinition(original, 'account-b', { meter: { 'meter-a': 'meter-b' } });
    expect(first.issues).toEqual([]);
    expect(first.definition.series[0].overrides).toEqual([
      { seriesId: 'utility:source:Electricity', accountGuid: 'account-b', visible: false, color: '#123456' },
      { seriesId: 'utility:source:Water', accountGuid: 'foreign-account', label: 'Dormant' },
      { resourceGuid: 'old-meter', accountGuid: 'account-a', visible: false }
    ]);
    const second = remapVisualizationDefinition(first.definition, 'account-c', { meter: { 'meter-b': 'meter-c' } });
    expect(second.issues).toEqual([]);
    expect(second.definition.series[0].overrides?.[0]).toMatchObject({ seriesId: 'utility:source:Electricity', accountGuid: 'account-c' });
    expect(second.definition.series[0].overrides?.[1]).toMatchObject({ accountGuid: 'foreign-account' });
    expect(original.series[0].overrides[0]).not.toHaveProperty('accountGuid');
  });

  it('remaps known Unassigned utility categories through their facility boundary without losing appearance', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const sourceId = 'utility:main';
    const original: VisualizationDefinition = { ...base, sources: [{ id: sourceId, kind: 'utility', measure: 'energy',
      aggregation: 'sum', dataMode: 'calendarized', groupBy: 'group', selection: { kind: 'rule', resource: 'meter', filter: {} } }],
      series: [{ ...wildcard, sourceId, overrides: [{ seriesId: `${sourceId}:unassigned:facility-a`,
        visible: false, color: '#123456', label: 'Hidden other meters', axis: 'right', lineStyle: 'dashed', order: 0 }] }] };
    const before = structuredClone(original);
    const first = remapVisualizationDefinition(original, 'account-b', { facility: { 'facility-a': 'facility-b' } });
    expect(first.issues).toEqual([]);
    expect(visualizationReferences(first.definition)).toEqual([]);
    expect(first.definition.series[0].overrides?.[0]).toEqual({ ...original.series[0].overrides![0],
      seriesId: `${sourceId}:unassigned:facility-b`, accountGuid: 'account-b' });
    const resolved = (facility: string) => [{ id: `${sourceId}:unassigned:${facility}`, sourceId, metric: 'energy',
      label: 'Unassigned', unit: 'kWh', dimension: 'energy', additive: true }];
    expect(resolveVisualizationSeries(first.definition, resolved('facility-b'))).toEqual([]);
    const ordered = resolveVisualizationSeries(first.definition, [
      { ...resolved('facility-b')[0], id: `${sourceId}:group-b`, resourceGuid: 'group-b', label: 'Other group' }, ...resolved('facility-b')
    ], true);
    expect(ordered.map(entry => entry.metadata.id)).toEqual([`${sourceId}:unassigned:facility-b`, `${sourceId}:group-b`]);
    const hidden = ordered[0];
    expect(hidden.selected).toMatchObject({ visible: false, color: '#123456', label: 'Hidden other meters', axis: 'right', lineStyle: 'dashed' });
    const second = remapVisualizationDefinition(first.definition, 'account-c', { facility: { 'facility-b': 'facility-c' } });
    expect(second.issues).toEqual([]);
    expect(second.definition.series[0].overrides?.[0]).toMatchObject({ seriesId: `${sourceId}:unassigned:facility-c`, accountGuid: 'account-c', order: 0 });
    expect(resolveVisualizationSeries(second.definition, resolved('facility-c'))).toEqual([]);
    expect(original).toEqual(before);
  });

  it('keeps unmapped or foreign Unassigned utility appearances dormant through later transfers', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const original: VisualizationDefinition = { ...base, sources: [{ id: 'utility', kind: 'utility', measure: 'energy',
      aggregation: 'sum', dataMode: 'calendarized', groupBy: 'group', selection: { kind: 'rule', resource: 'meter', filter: {} } }],
      series: [{ ...wildcard, overrides: [
        { seriesId: 'utility:unassigned:facility-a', visible: false, order: 0 },
        { seriesId: 'utility:unassigned:foreign-facility', accountGuid: 'foreign-account', visible: false, label: 'Dormant' },
        { seriesId: 'utility:source:Electricity', color: '#123456' }, { seriesId: 'utility:total', label: 'Selected total' }
      ] }] };
    const first = remapVisualizationDefinition(original, 'account-b', {});
    expect(first.issues).toEqual([]);
    expect(first.definition.series[0].overrides?.[0]).toMatchObject({ seriesId: 'utility:unassigned:facility-a', accountGuid: 'account-a', visible: false });
    expect(first.definition.series[0].overrides?.[1]).toEqual(original.series[0].overrides![1]);
    expect(first.definition.series[0].overrides?.slice(2).map(override => override.accountGuid)).toEqual(['account-b', 'account-b']);
    const second = remapVisualizationDefinition(first.definition, 'account-c', { facility: {
      'facility-a': 'unrelated-facility', 'foreign-facility': 'unrelated-foreign-facility'
    } });
    expect(second.issues).toEqual([]);
    expect(second.definition.series[0].overrides?.[0]).toEqual(first.definition.series[0].overrides?.[0]);
    expect(second.definition.series[0].overrides?.[1]).toEqual(original.series[0].overrides![1]);
    const collision = [{ id: 'utility:unassigned:facility-a', sourceId: 'utility', metric: 'energy', label: 'Other account meters',
      unit: 'kWh', dimension: 'energy', additive: true }];
    expect(resolveVisualizationSeries(second.definition, collision)).toHaveLength(1);
    expect(resolveVisualizationSeries(second.definition, collision)[0].selected.visible).not.toBe(false);
  });

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
