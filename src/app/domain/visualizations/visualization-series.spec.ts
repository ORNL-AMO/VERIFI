import type { VisualizationDefinition } from './visualization-definition';
import { utilityVisualizationFixture } from './testing/visualization-fixtures';
import { resolveVisualizationSeries } from './visualization-series';
import type { ResolvedVisualizationSeries } from './visualization-source-provider';

const resolved: readonly ResolvedVisualizationSeries[] = ['meter-a', 'meter-b', 'new-meter'].map(resourceGuid => ({
  id: `utility:energy:${resourceGuid}`, sourceId: 'utility', metric: 'energy', resourceGuid, label: resourceGuid,
  unit: 'kWh', dimension: 'energy', energyTreatment: 'site', additive: true
}));

function matchingDefinition() {
  const base = utilityVisualizationFixture();
  const { resourceGuid, ...wildcard } = base.series[0];
  return { ...base, series: [{ ...wildcard, overrides: [
    { resourceGuid: 'meter-b', color: '#123456', axis: 'right' as const, order: 0 },
    { resourceGuid: 'meter-a', visible: false },
    { resourceGuid: 'absent-meter', label: 'Retain dormant preference' }
  ] }] };
}

describe('effective visualization series', () => {
  it('resolves item type before declared series type and the chart default, without using foreign exceptions', () => {
    const base = matchingDefinition();
    const definition: VisualizationDefinition = { ...base, chart: { kind: 'time-series', defaultTraceType: 'bar', interval: 'monthly', stack: 'none' },
      series: [{ ...base.series[0], traceType: 'line', overrides: [
        { resourceGuid: 'meter-a', traceType: 'bar' }, { resourceGuid: 'meter-b', traceType: 'bar', accountGuid: 'foreign' }
      ] }] };
    expect(resolveVisualizationSeries(definition, resolved).map(item => item.selected.traceType)).toEqual(['bar', 'line', 'line']);
    expect(resolveVisualizationSeries({ ...definition, series: [{ ...base.series[0], overrides: [] }] }, resolved).map(item => item.selected.traceType))
      .toEqual(['bar', 'bar', 'bar']);
  });

  it('applies exact-resource overrides before defaults and includes new live matches without changing intent', () => {
    const definition = matchingDefinition(), before = structuredClone(definition);
    const result = resolveVisualizationSeries(definition, resolved);
    expect(result.map(item => item.metadata.resourceGuid)).toEqual(['meter-b', 'new-meter']);
    expect(result[0].selected).toMatchObject({ color: '#123456', axis: 'right' });
    expect(result[1].selected).toMatchObject({ color: baseColor(), axis: 'left' });
    expect(definition).toEqual(before);
    expect(resolveVisualizationSeries(definition, resolved, true)).toHaveLength(3);
  });

  it('retains category visibility, styling and order by provider identity without inventing resource GUIDs', () => {
    const definition = matchingDefinition();
    const categories: readonly ResolvedVisualizationSeries[] = ['Electricity', 'Water', 'Unassigned', 'Future'].map(category => ({
      id: `utility:source:${category}`, sourceId: 'utility', metric: 'energy', label: category, unit: 'kWh', dimension: 'energy', additive: true
    }));
    const selected: VisualizationDefinition = { ...definition, series: [{ ...definition.series[0], overrides: [
      { seriesId: 'utility:source:Unassigned', color: '#345678', label: 'Other meters', axis: 'right' as const, order: 0 },
      { seriesId: 'utility:source:Water', visible: false },
      { seriesId: 'utility:source:Absent', label: 'Dormant' }
    ] }] };
    const before = structuredClone(selected), result = resolveVisualizationSeries(selected, categories);
    expect(result.map(entry => entry.metadata.label)).toEqual(['Unassigned', 'Electricity', 'Future']);
    expect(result[0].selected).toMatchObject({ color: '#345678', label: 'Other meters', axis: 'right' });
    expect(result[0].selected).not.toHaveProperty('seriesId');
    expect(result[0].selected).not.toHaveProperty('order');
    expect(result[0].selected).not.toHaveProperty('resourceGuid');
    expect(resolveVisualizationSeries(selected, categories, true)).toHaveLength(4);
    expect(selected).toEqual(before);
  });

  it('keeps provider order when only a member appearance changes', () => {
    const definition = matchingDefinition();
    const selected: VisualizationDefinition = { ...definition, series: [{ ...definition.series[0], overrides: [
      { resourceGuid: 'meter-b', label: 'Edited second member', color: '#345678' }
    ] }] };
    const result = resolveVisualizationSeries(selected, resolved);
    expect(result.map(entry => entry.metadata.resourceGuid)).toEqual(['meter-a', 'meter-b', 'new-meter']);
    expect(result[1].selected.label).toBe('Edited second member');
  });

  it('uses only explicit order before unordered members and preserves provider order for equal positions', () => {
    const definition = matchingDefinition();
    const selected: VisualizationDefinition = { ...definition, series: [{ ...definition.series[0], overrides: [
      { resourceGuid: 'new-meter', order: 0 }, { resourceGuid: 'meter-b', label: 'Appearance only' },
      { resourceGuid: 'meter-a', order: 1 }
    ] }] };
    expect(resolveVisualizationSeries(selected, resolved).map(entry => entry.metadata.resourceGuid)).toEqual(['new-meter', 'meter-a', 'meter-b']);
    const equal: VisualizationDefinition = { ...definition, series: [{ ...definition.series[0], overrides: [
      { resourceGuid: 'new-meter', order: 0 }, { resourceGuid: 'meter-a', order: 0 }
    ] }] };
    expect(resolveVisualizationSeries(equal, resolved).map(entry => entry.metadata.resourceGuid)).toEqual(['meter-a', 'new-meter', 'meter-b']);
  });

  it('gives resource overrides precedence over a provider selector targeting that same series', () => {
    const definition = matchingDefinition();
    const selected: VisualizationDefinition = { ...definition, series: [{ ...definition.series[0], overrides: [
      { seriesId: resolved[0].id, visible: false, label: 'Provider appearance' },
      { resourceGuid: 'meter-a', visible: true, label: 'Resource appearance' }
    ] }] };
    const result = resolveVisualizationSeries(selected, resolved);
    expect(result.find(entry => entry.metadata.resourceGuid === 'meter-a')?.selected).toMatchObject({ visible: true, label: 'Resource appearance' });
  });

  it('does not apply a retained override to another account even if a resource GUID happens to match', () => {
    const definition = matchingDefinition();
    const transferred = { ...definition, accountGuid: 'account-b', series: definition.series.map(series => ({ ...series,
      overrides: series.overrides.map(override => ({ ...override, accountGuid: 'account-a' })) })) };
    expect(resolveVisualizationSeries(transferred, resolved).map(item => item.metadata.resourceGuid)).toEqual(['meter-a', 'meter-b', 'new-meter']);
    expect(resolveVisualizationSeries(transferred, resolved)[0].selected.color).toBe(baseColor());
  });

  it('lets an explicit selected resource win over a matching-set declaration without duplicate traces', () => {
    const definition = matchingDefinition();
    const exact = { ...utilityVisualizationFixture().series[0], id: 'exact-a', visible: true, label: 'Explicit resource' };
    const result = resolveVisualizationSeries({ ...definition, series: [...definition.series, exact] }, resolved);
    expect(result.filter(item => item.metadata.resourceGuid === 'meter-a')).toHaveLength(1);
    expect(result.find(item => item.metadata.resourceGuid === 'meter-a')?.selected.label).toBe('Explicit resource');
  });

  it('orders exact and matching-set items together within stable source groups', () => {
    const base = utilityVisualizationFixture(), { resourceGuid: _resourceGuid, ...wildcard } = base.series[0];
    const definition: VisualizationDefinition = { ...base, series: [
      { ...base.series[0], id: 'exact-a', traceType: 'bar', label: 'Exact A', overrides: [
        { accountGuid: base.accountGuid, resourceGuid: 'meter-a', order: 1 }
      ] },
      { ...wildcard, id: 'matching', traceType: 'line', overrides: [
        { accountGuid: base.accountGuid, resourceGuid: 'meter-b', order: 0 },
        { accountGuid: base.accountGuid, resourceGuid: 'meter-c', order: 2 }
      ] },
      { ...wildcard, id: 'other-source', sourceId: 'other', overrides: [{ resourceGuid: 'other-meter', order: 0 }] }
    ] };
    const metadata = ['meter-a', 'meter-b', 'meter-c', 'other-meter'].map(resourceGuid => ({ ...resolved[0],
      id: `utility:energy:${resourceGuid}`, resourceGuid, sourceId: resourceGuid === 'other-meter' ? 'other' : 'utility' }));
    const result = resolveVisualizationSeries(definition, metadata);
    expect(result.map(item => item.metadata.resourceGuid)).toEqual(['meter-b', 'meter-a', 'meter-c', 'other-meter']);
    expect(result.map(item => item.selected.traceType)).toEqual(['line', 'bar', 'line', 'line']);
    expect(result[1].selected.label).toBe('Exact A');
    expect(result.every(item => !Object.hasOwn(item, 'order') && !Object.hasOwn(item.selected, 'order'))).toBe(true);
  });
});

function baseColor() { return utilityVisualizationFixture().series[0].color; }
