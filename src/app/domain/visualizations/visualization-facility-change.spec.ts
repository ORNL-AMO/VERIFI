import { analysisVisualizationFixture, utilityVisualizationFixture } from './testing/visualization-fixtures';
import type { UtilityVisualizationSource, VisualizationDefinition } from './visualization-definition';
import { prepareVisualizationFacilityChange } from './visualization-facility-change';
import type { VisualizationFacilityCatalog } from './visualization-facilities';

const catalog: VisualizationFacilityCatalog = {
  facilities: [{ guid: 'facility-a', accountId: 'account-a' }, { guid: 'facility-b', accountId: 'account-a' }],
  meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a' }, { guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b' }],
  meterGroups: [], predictors: [], energyUseGroups: [], energyUseEquipment: [], facilityAnalyses: [], accountAnalyses: []
};

describe('reviewed visualization facility inclusion', () => {
  it.each(['predictor', 'facility', 'equipment', 'energy-use-group'] as const)('prunes known excluded %s resources and retains unknown intent', resource => {
    const base = utilityVisualizationFixture();
    const source = resource === 'predictor'
      ? { id: 'selected', kind: 'predictor' as const, measure: 'value' as const, aggregation: 'none' as const,
        selection: { kind: 'fixed' as const, resource, guids: ['item-a', 'item-b', 'missing'] } }
      : { id: 'selected', kind: 'energy-use' as const, measure: 'consumption' as const, aggregation: 'sum' as const, denominator: 'facility' as const,
        selection: { kind: 'fixed' as const, resource, guids: resource === 'facility' ? ['facility-a', 'facility-b', 'missing'] : ['item-a', 'item-b', 'missing'] } };
    const guid = resource === 'facility' ? 'facility-b' : 'item-b';
    const definition: VisualizationDefinition = { ...base, sources: [source], series: [
      { id: 'excluded', sourceId: source.id, metric: source.measure, resourceGuid: guid, axis: 'left', color: '#123456' },
      { id: 'unknown', sourceId: source.id, metric: source.measure, resourceGuid: 'missing', axis: 'left' }
    ] };
    const items = [{ guid: 'item-a', accountId: 'account-a', facilityId: 'facility-a' }, { guid: 'item-b', accountId: 'account-a', facilityId: 'facility-b' }];
    const changed = prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a'] },
      { ...catalog, predictors: items, energyUseEquipment: items, energyUseGroups: items });
    expect(changed.definition.sources[0]).toMatchObject({ selection: { guids: [resource === 'facility' ? 'facility-a' : 'item-a', 'missing'] } });
    expect(changed.definition.series.map(item => item.id)).toEqual(['unknown']);
    expect(changed.cleared).toEqual(expect.arrayContaining(['Excluded resource selections', 'Excluded item presentation']));
  });
  it.each([false, true])('prunes proven Analysis facility items without guessing group or model identities (model: %s)', model => {
    const base = analysisVisualizationFixture(model);
    const definition: VisualizationDefinition = { ...base, facilitySelection: { kind: 'fixed', facilityGuids: ['facility-a', 'facility-b'] },
      sources: base.sources.map(source => source.kind === 'analysis' ? { ...source, analysisGuid: 'account-analysis' } : source),
      series: [
        { id: 'excluded', sourceId: base.sources[0].id, metric: 'actual', resourceGuid: 'facility-b', axis: 'left', color: '#123456' },
        { id: 'retained', sourceId: base.sources[0].id, metric: 'actual', resourceGuid: 'facility-a', axis: 'left' },
        { id: 'members', sourceId: base.sources[0].id, metric: 'actual', axis: 'left', overrides: [
          { resourceGuid: 'facility-b', color: '#123456' }, { resourceGuid: 'ambiguous', label: 'Unknown retained' },
          { resourceGuid: 'facility-b', accountGuid: 'foreign-account', label: 'Foreign retained' },
          { resourceGuid: 'group-a', label: 'Group retained' }, ...(model ? [{ resourceGuid: 'model-a', label: 'Model retained' }] : [])
        ] }
      ], chart: { kind: 'scatter', xSeriesId: 'excluded', ySeriesId: 'retained', showFit: false } };
    const result = prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a'] },
      { ...catalog, accountAnalyses: [{ guid: 'account-analysis', accountId: 'account-a' }] });
    expect(result.definition.sources).toEqual(definition.sources);
    expect(result.definition.series.map(item => item.id)).toEqual(['retained', 'members']);
    expect(result.definition.series[1].overrides).toEqual(definition.series[2].overrides!.slice(1));
    expect(result.definition.chart).toEqual({ kind: 'scatter', ySeriesId: 'retained', showFit: false });
    expect(result.cleared).toContain('Excluded item presentation');
  });
  it('retains compatible siblings, missing intent, owner bindings and dates while pruning excluded styling', () => {
    const base = utilityVisualizationFixture({ kind: 'all' });
    const definition: VisualizationDefinition = { ...base, period: { kind: 'fiscal-year', year: 2025 }, comparison: { kind: 'previous-year', basis: 'fiscal' },
      sources: base.sources.map(source => source.kind === 'utility' ? { ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b', 'missing-meter'] } } : source),
      series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left', overrides: [
        { resourceGuid: 'meter-a', color: '#123456' }, { resourceGuid: 'meter-b', lineStyle: 'dashed' }, { resourceGuid: 'missing-meter', label: 'Retained' },
        { resourceGuid: 'meter-b', accountGuid: 'foreign-account', label: 'Foreign retained' }
      ] }] };
    const before = structuredClone(definition);
    const result = prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a'] }, catalog);
    expect(result.definition.sources[0]).toMatchObject({ selection: { guids: ['meter-a', 'missing-meter'] }, settings: base.sources[0].settings });
    expect(result.definition.series[0].overrides).toEqual([definition.series[0].overrides![0], definition.series[0].overrides![2], definition.series[0].overrides![3]]);
    expect(result.definition.period).toEqual(definition.period); expect(result.definition.comparison).toEqual(definition.comparison);
    expect(result.cleared).toEqual(expect.arrayContaining(['Excluded resource selections', 'Excluded item presentation']));
    expect(definition).toEqual(before);
  });

  it('retains live Source category intent and style when narrowing its participating facilities', () => {
    const base = utilityVisualizationFixture({ kind: 'all' });
    const source: UtilityVisualizationSource = { ...base.sources[0] as UtilityVisualizationSource, selectionMode: 'source', groupBy: 'source',
      selection: { kind: 'rule', resource: 'meter', filter: { utilitySources: ['Electricity'] } } };
    const definition = { ...base, sources: [source], series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const,
      overrides: [{ seriesId: 'utility:source:Electricity', color: '#123456' }] }] };
    const result = prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a'] }, catalog);
    expect(result.definition.sources).toEqual(definition.sources); expect(result.definition.series).toEqual(definition.series); expect(result.cleared).toEqual([]);
  });

  it('clears an exhausted restrictive rule instead of converting it into All, including dormant styling', () => {
    const base = utilityVisualizationFixture({ kind: 'all' });
    const source: UtilityVisualizationSource = { ...base.sources[0] as UtilityVisualizationSource, selectionMode: 'rule',
      selection: { kind: 'rule', resource: 'meter', filter: { facilityGuids: ['facility-b'], search: 'Boiler' } } };
    const definition = { ...base, sources: [source], series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const,
      overrides: [{ resourceGuid: 'missing-meter', color: '#123456' }] }] };
    const result = prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a'] }, catalog);
    expect(result.definition.sources[0]).not.toHaveProperty('selection'); expect(result.definition.series).toEqual([]);
    expect(result.cleared).toEqual(expect.arrayContaining(['Selections outside the included facilities', 'Excluded item presentation']));
  });

  it('keeps the same selection unchanged without writing canonicalization', () => {
    const definition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-b', 'facility-a'] });
    expect(prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a', 'facility-b'] }, catalog)).toEqual({ definition, cleared: [] });
  });
  it('does not erase dormant styling from an already incomplete fixed source without an excluded binding', () => {
    const base = utilityVisualizationFixture({ kind: 'all' });
    const definition: VisualizationDefinition = { ...base, sources: base.sources.map(source => source.kind === 'utility'
      ? { ...source, selection: { kind: 'fixed', resource: 'meter', guids: [] } } : source),
      series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left', overrides: [{ resourceGuid: 'missing-meter', color: '#123456' }] }] };
    const result = prepareVisualizationFacilityChange(definition, { kind: 'fixed', facilityGuids: ['facility-a'] }, catalog);
    expect(result.definition.sources).toEqual(definition.sources); expect(result.definition.series).toEqual(definition.series);
    expect(result.cleared).toEqual([]);
  });
});
