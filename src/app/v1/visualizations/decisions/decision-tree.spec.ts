import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { createVisualizationDefinition, createVisualizationSetupDefinition, type UtilityVisualizationSource, type VisualizationDefinition, type VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { group, meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { configuredChartSummary, decisionNodeId, meterResourceChoices, nativeObservationAvailable, prepareDecisionChange, projectMeterItems } from './decision-tree';
import type { VisualizationDecisionAction } from './decision-types';
import { discoverUtilitySeries } from '@domain/visualizations/utility/utility-catalog';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';

const snapshot = () => ({ ...visualizationSnapshot(), meters: [meter({ groupId: 'group-a' }), meter({ guid: 'meter-b', groupId: 'group-a', source: 'Natural Gas' })],
  meterGroups: [group({ guid: 'group-a', name: 'Boilers' }), group({ guid: 'empty-group', name: 'Future equipment' })], meterData: [reading({})] });
function initial(): VisualizationDefinition {
  return createVisualizationSetupDefinition({ name: 'Meter chart', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
    chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' }, sourceKinds: ['utility'] });
}
function apply(definition: VisualizationDefinition, action: VisualizationDecisionAction, data = snapshot()): VisualizationDefinition {
  const result = prepareDecisionChange(definition, action, { snapshot: data });
  return result.state === 'unchanged' ? definition : result.definition;
}
function selected(mode: 'source' | 'group' | 'meter' | 'facility' | 'rule', ids: readonly string[] = []): VisualizationDefinition {
  let definition = apply(initial(), { kind: 'selection-mode', sourceId: 'source-1', mode });
  for (const resourceId of ids) definition = apply(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId, selected: true });
  return definition;
}

describe('shared visualization decisions', () => {
  it('aggregates selected meters by facility without replacing their selection', () => {
    const original = selected('meter', ['meter-a', 'meter-b']);
    const grouped = apply(original, { kind: 'source-settings', sourceId: 'source-1', settings: { aggregation: 'sum', groupBy: 'facility' } });
    expect((grouped.sources[0] as UtilityVisualizationSource).selection).toEqual((original.sources[0] as UtilityVisualizationSource).selection);
    expect(projectMeterItems(grouped, 'source-1', snapshot()).map(item => item.identity.resourceGuid)).toEqual(['facility-a']);
    expect(nativeObservationAvailable(grouped, 'source-1', snapshot())).toBe(false);
    const separate = apply(grouped, { kind: 'source-settings', sourceId: 'source-1', settings: { aggregation: 'sum', groupBy: 'meter' } });
    expect(projectMeterItems(separate, 'source-1', snapshot()).map(item => item.identity.resourceGuid)).toEqual(['meter-a', 'meter-b']);
    const changed = apply(grouped, { kind: 'selection-mode', sourceId: 'source-1', mode: 'source' });
    expect(changed.sources[0]).toMatchObject({ selectionMode: 'source', groupBy: 'facility' });
  });
  it('includes every requested resource together while retaining existing item settings', () => {
    const definition = apply(selected('meter', ['meter-a']), { kind: 'item-style', sourceId: 'source-1',
      item: { resourceGuid: 'meter-a' }, changes: { color: '#123456' } });
    const result = prepareDecisionChange(definition, { kind: 'set-resources', sourceId: 'source-1', resourceIds: ['meter-a', 'meter-b'] }, { snapshot: snapshot() });
    expect(result.state).toBe('apply');
    if (result.state === 'unchanged') throw new Error('Expected Include All.');
    expect(result.definition.sources[0]).toMatchObject({ selection: { kind: 'fixed', guids: ['meter-a', 'meter-b'] } });
    expect(projectMeterItems(result.definition, 'source-1', snapshot()).find(item => item.identity.resourceGuid === 'meter-a')?.appearance.color).toBe('#123456');
    expect(prepareDecisionChange(definition, { kind: 'set-resources', sourceId: 'source-1', resourceIds: ['meter-a', 'foreign-meter'] }, { snapshot: snapshot() }))
      .toEqual({ state: 'unchanged' });
  });
  it('reviews clearing Include All once and leaves an empty Source selection unconfigured', () => {
    let definition = selected('source', ['Electricity', 'Natural Gas']);
    definition = { ...definition, series: definition.series.map(series => ({ ...series, color: '#123456' })) };
    const result = prepareDecisionChange(definition, { kind: 'set-resources', sourceId: 'source-1', resourceIds: [] }, { snapshot: snapshot() });
    expect(result.state).toBe('confirm');
    if (result.state === 'unchanged') throw new Error('Expected reviewed clearing.');
    expect(result.definition.sources[0]).not.toHaveProperty('selection');
    expect(result.definition.series).toEqual([]);
    expect(result.affectedNodeIds).toContain(decisionNodeId({ kind: 'item', sourceId: 'source-1', itemKey: 'series:source-1:source:Electricity' }));
    expect((definition.sources[0] as UtilityVisualizationSource).selection).toMatchObject({ filter: { utilitySources: ['Electricity', 'Natural Gas'] } });
  });
  it('removes every configuration in a deselected category as one reviewed change', () => {
    let definition = selected('meter', ['meter-a']);
    definition = apply(definition, { kind: 'add-source', sourceKind: 'utility' });
    definition = apply(definition, { kind: 'add-source', sourceKind: 'predictor' });
    const result = prepareDecisionChange(definition, { kind: 'remove-source-kind', sourceKind: 'utility' },
      { snapshot: snapshot(), invalidNodeIds: ['data-settings:utility-1'] });
    expect(result.state).toBe('confirm');
    if (result.state === 'unchanged') throw new Error('Expected category removal.');
    expect(result.definition.sources).toEqual(definition.sources.filter(source => source.kind === 'predictor'));
    expect(result.definition.series).toEqual([]);
    expect(result.affectedNodeIds).toContain('source:source-1');
    expect(result.affectedNodeIds).toContain('source:utility-1');
    expect(result.cleared).toContain('Incomplete input in the affected sections');
    expect(prepareDecisionChange(result.definition, { kind: 'remove-source-kind', sourceKind: 'predictor' }, { snapshot: snapshot() }))
      .toEqual({ state: 'unchanged' });
  });
  it('retains identity and values for equal decisions without requesting confirmation', () => {
    const definition = selected('meter', ['meter-a']);
    const result = prepareDecisionChange(definition, { kind: 'selection-mode', sourceId: 'source-1', mode: 'meter' }, { snapshot: snapshot() });
    expect(result).toEqual({ state: 'unchanged' });
    expect(apply(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: true })).toBe(definition);
  });
  it('offers owned resources without usable history, including empty groups', () => {
    const data = snapshot();
    expect(meterResourceChoices(data, { kind: 'portfolio', facilityGuids: ['facility-a'] }, 'group')).toContainEqual(expect.objectContaining({ value: 'empty-group', available: false }));
    expect(meterResourceChoices(data, { kind: 'portfolio', facilityGuids: ['facility-a'] }, 'meter')).toContainEqual(expect.objectContaining({ value: 'meter-b', available: false }));
    expect(apply(initial(), { kind: 'selection-mode', sourceId: 'source-1', mode: 'group' }).sources[0]).toMatchObject({ selectionMode: 'group' });
  });
  it('retains empty configured branches and their stable appearance when readings and members arrive', () => {
    const empty = selected('group', ['empty-group']);
    const before = projectMeterItems(empty, 'source-1', snapshot())[0];
    expect(before).toMatchObject({ label: 'Future equipment', available: false, missing: false });
    const expanded = { ...snapshot(), meters: [...snapshot().meters, meter({ guid: 'new-meter', groupId: 'empty-group' })] };
    const after = projectMeterItems(empty, 'source-1', expanded)[0];
    expect(after.key).toBe(before.key); expect(after.appearance.color).toBe(before.appearance.color); expect(after.appearance.lineStyle).toBe(before.appearance.lineStyle);
  });
  it('makes removing the final Source setup-required instead of matching every meter', () => {
    const definition = selected('source', ['Electricity']);
    const next = apply(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'Electricity', selected: false });
    expect(next.sources[0]).toMatchObject({ selectionMode: 'source', groupBy: 'source' });
    expect((next.sources[0] as UtilityVisualizationSource).selection).toBeUndefined(); expect(next.series).toEqual([]);
    expect(projectMeterItems(next, 'source-1', snapshot())).toEqual([]);
    const rule = selected('rule'); expect((rule.sources[0] as UtilityVisualizationSource).selection).toEqual({ kind: 'rule', resource: 'meter', filter: {} });
    expect(projectMeterItems(rule, 'source-1', snapshot())).toHaveLength(2);
  });
  it('clears only the explicitly removed item and gives it defaults if re-added', () => {
    let definition = selected('meter', ['meter-a', 'meter-b']);
    definition = apply(definition, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-a' }, changes: { color: '#123456', traceType: 'bar' } });
    definition = apply(definition, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-b' }, changes: { label: 'Retained sibling' } });
    const result = prepareDecisionChange(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: false }, { snapshot: snapshot() });
    expect(result.state).toBe('confirm'); if (result.state === 'unchanged') throw new Error('Expected removal.');
    expect(projectMeterItems(result.definition, 'source-1', snapshot())[0].appearance.label).toBe('Retained sibling');
    const restored = apply(result.definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: true });
    const item = projectMeterItems(restored, 'source-1', snapshot()).find(item => item.identity.resourceGuid === 'meter-a')!;
    expect(item.appearance.traceType).toBe('line'); expect(item.appearance.color).not.toBe('#123456');
  });
  it('applies a matching default globally when an item has a different type and preserves foreign settings', () => {
    let definition = selected('meter', ['meter-a', 'meter-b']);
    definition = apply(definition, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-a' }, changes: { traceType: 'bar', color: '#123456' } });
    definition = { ...definition, series: definition.series.map(series => ({ ...series, overrides: [...series.overrides ?? [], { resourceGuid: 'foreign', accountGuid: 'other-account', traceType: 'bar' as const }] })) };
    expect(configuredChartSummary(definition, snapshot())).toBe('Combination');
    const result = prepareDecisionChange(definition, { kind: 'chart-type', traceType: 'line' }, { snapshot: snapshot() });
    expect(result.state).toBe('confirm'); if (result.state === 'unchanged') throw new Error('Expected a type edit.');
    expect(configuredChartSummary(result.definition, snapshot())).toBe('Line');
    expect(result.definition.series[0].overrides).toContainEqual({ resourceGuid: 'foreign', accountGuid: 'other-account', traceType: 'bar' });
    expect(projectMeterItems(result.definition, 'source-1', snapshot())[0].appearance.color).toBe('#123456');
  });
  it('prioritizes resource overrides above provider overrides and projects missing selected identities', () => {
    let definition = selected('meter', ['meter-a']);
    const overrides: readonly VisualizationSeriesOverride[] = [
      { seriesId: 'source-1:meter-a', label: 'Provider label', color: '#123456' }, { resourceGuid: 'meter-a', label: 'Resource label' }
    ];
    definition = { ...definition, series: definition.series.map(series => ({ ...series, overrides })) };
    expect(projectMeterItems(definition, 'source-1', snapshot())[0].appearance.label).toBe('Resource label');
    const missing = projectMeterItems(definition, 'source-1', { ...snapshot(), meters: [] })[0];
    expect(missing.missing).toBe(true); expect(missing.identity.resourceGuid).toBe('meter-a');
  });
  it('forgets provider-ID fallback appearance and prunes exact axis bindings on explicit removal', () => {
    let definition = selected('meter', ['meter-a', 'meter-b']);
    definition = { ...definition, series: definition.series.map(series => ({ ...series,
      overrides: [{ seriesId: 'source-1:meter-a', label: 'Old provider label', traceType: 'bar' as const }] })) };
    const removed = apply(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: false });
    const restored = apply(removed, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: true });
    const item = projectMeterItems(restored, 'source-1', snapshot()).find(item => item.identity.resourceGuid === 'meter-a')!;
    expect(item.appearance.label).toBeUndefined(); expect(item.appearance.traceType).toBe('line');
    const exact: VisualizationDefinition = { ...definition, chart: { kind: 'scatter', xSeriesId: 'exact-a', ySeriesId: 'exact-b', showFit: false },
      series: [{ id: 'exact-a', sourceId: 'source-1', metric: 'energy', resourceGuid: 'meter-a', axis: 'left' }, { id: 'exact-b', sourceId: 'source-1', metric: 'energy', resourceGuid: 'meter-b', axis: 'left' }] };
    expect(apply(exact, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: false }).chart)
      .toEqual({ kind: 'scatter', ySeriesId: 'exact-b', showFit: false });
  });
  it('requires one resolved meter for native observations but does not require readings', () => {
    const one = selected('meter', ['meter-b']);
    expect(nativeObservationAvailable(one, 'source-1', snapshot())).toBe(true);
    const many = selected('meter', ['meter-a', 'meter-b']); expect(nativeObservationAvailable(many, 'source-1', snapshot())).toBe(false);
    expect(nativeObservationAvailable(selected('group', ['group-a']), 'source-1', snapshot())).toBe(false);
  });
  it('atomically resets native observations for user-driven selections that require multiple meters', () => {
    let definition = selected('meter', ['meter-a']);
    definition = apply(definition, { kind: 'source-settings', sourceId: 'source-1', settings: { dataMode: 'billing-period' } });
    const result = prepareDecisionChange(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-b', selected: true }, { snapshot: snapshot() });
    expect(result.state).toBe('confirm'); if (result.state === 'unchanged') throw new Error('Expected selection edit.');
    expect(result.definition).toMatchObject({ sources: [{ dataMode: 'calendarized', selection: { guids: ['meter-a', 'meter-b'] } }], chart: { interval: 'monthly' } });
    expect(result.cleared).toContain('Native bill observation view');
    expect(result.next).toEqual({ kind: 'data-settings', sourceId: 'source-1' });
    expect(result.affectedNodeIds).not.toContain(decisionNodeId({ kind: 'data-settings', sourceId: 'source-1' }));
    let rule = selected('rule');
    rule = { ...rule, sources: rule.sources.map(source => source.kind === 'utility'
      ? { ...source, selection: { kind: 'rule', resource: 'meter', filter: { utilitySources: ['Electricity'] } } } : source) };
    rule = apply(rule, { kind: 'source-settings', sourceId: 'source-1', settings: { dataMode: 'billing-period' } });
    const all = prepareDecisionChange(definition, { kind: 'set-resources', sourceId: 'source-1', resourceIds: ['meter-a', 'meter-b'] }, { snapshot: snapshot() });
    expect(all.state).toBe('confirm');
    if (all.state === 'unchanged') throw new Error('Expected reviewed Include All.');
    expect(all.definition.sources[0]).toMatchObject({ dataMode: 'calendarized' });
    const cosmetic = apply(rule, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-a' }, changes: { color: '#123456' } },
      { ...snapshot(), meters: [...snapshot().meters, meter({ guid: 'new-electricity' })] });
    expect(cosmetic.sources[0]).toMatchObject({ dataMode: 'billing-period' });
    expect(prepareDecisionChange(rule, { kind: 'source-settings', sourceId: 'source-1', settings: {} },
      { snapshot: { ...snapshot(), meters: [...snapshot().meters, meter({ guid: 'new-electricity' })] } }).state).toBe('unchanged');
  });
  it('resets charge-dependent presentation when changing the measure without losing compatible meter styling', () => {
    let definition = selected('meter', ['meter-a']);
    definition = apply(definition, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-a' }, changes: { color: '#123456' } });
    const cost = apply(definition, { kind: 'measure', sourceId: 'source-1', measure: 'cost' });
    expect(projectMeterItems(cost, 'source-1', snapshot())[0].appearance.color).toBe('#123456');
    const charge = apply(cost, { kind: 'measure', sourceId: 'source-1', measure: 'charge' });
    expect(charge.series).toEqual([]); expect((charge.sources[0] as UtilityVisualizationSource).selection).toBeUndefined();
    const compared: VisualizationDefinition = { ...cost, comparison: { kind: 'previous-year', basis: 'calendar' } };
    const chargeReset = prepareDecisionChange(compared, { kind: 'measure', sourceId: 'source-1', measure: 'charge' }, { snapshot: snapshot() });
    expect(chargeReset.state).toBe('confirm');
    if (chargeReset.state !== 'unchanged') expect(chargeReset.definition.comparison).toEqual({ kind: 'none' });
  });
  it('reviews incompatible pinned settings before a measure change and retains compatible units', () => {
    const original = selected('meter', ['meter-a']);
    const definition: VisualizationDefinition = { ...original, sources: original.sources.map(source => ({ ...source,
      settings: { unit: { kind: 'pinned', value: 'kWh' }, energyTreatment: { kind: 'pinned', value: 'source' } } })) };
    const result = prepareDecisionChange(definition, { kind: 'measure', sourceId: 'source-1', measure: 'cost' }, { snapshot: snapshot() });
    expect(result.state).toBe('confirm');
    if (result.state !== 'unchanged') {
      expect(result.cleared).toEqual(expect.arrayContaining(['Pinned unit', 'Pinned energy treatment']));
      expect(result.definition.sources[0]).toMatchObject({ measure: 'cost', settings: {}, selection: { guids: ['meter-a'] } });
    }
    expect(definition.sources[0].settings?.unit).toEqual({ kind: 'pinned', value: 'kWh' });
    const emissions: VisualizationDefinition = { ...original, sources: original.sources.map(source => source.kind === 'utility' ? { ...source, measure: 'location-emissions',
      settings: { unit: { kind: 'pinned', value: 'tonne CO2e' } } } : source) };
    const compatible = prepareDecisionChange(emissions, { kind: 'measure', sourceId: 'source-1', measure: 'market-emissions' }, { snapshot: snapshot() });
    expect(compatible.state).toBe('apply');
    if (compatible.state !== 'unchanged') expect(compatible.definition.sources[0].settings?.unit).toEqual({ kind: 'pinned', value: 'tonne CO2e' });
    const empty = selected('group', ['empty-group']);
    const emptyEmissions: VisualizationDefinition = { ...empty, sources: empty.sources.map(source => source.kind === 'utility'
      ? { ...source, measure: 'location-emissions', settings: { unit: { kind: 'pinned', value: 'tonne CO2e' } } } : source) };
    const unknown = prepareDecisionChange(emptyEmissions, { kind: 'measure', sourceId: 'source-1', measure: 'consumption' }, { snapshot: snapshot() });
    expect(unknown.state).toBe('confirm');
    if (unknown.state !== 'unchanged') expect(unknown.definition.sources[0].settings?.unit).toEqual({ kind: 'owner' });
  });
  it('retains saved item ordering across presentation edits without a reorder control', () => {
    const original = selected('meter', ['meter-a', 'meter-b']);
    const data = { ...snapshot(), meters: [...snapshot().meters, meter({ guid: 'meter-c' })] };
    const definition: VisualizationDefinition = { ...original,
      sources: original.sources.map(source => source.kind === 'utility' ? { ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b', 'meter-c'] } } : source),
      series: [{ id: 'exact-a', sourceId: 'source-1', metric: 'energy', resourceGuid: 'meter-a', axis: 'left', overrides: [{ resourceGuid: 'meter-a', order: 2 }] },
        { id: 'wildcard', sourceId: 'source-1', metric: 'energy', axis: 'left', overrides: [{ resourceGuid: 'meter-b', order: 0 }, { resourceGuid: 'meter-c', order: 1 }] }] };
    const changed = apply(definition, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-b' }, changes: { color: '#123456' } }, data);
    expect(projectMeterItems(changed, 'source-1', data).map(item => item.identity.resourceGuid)).toEqual(['meter-b', 'meter-c', 'meter-a']);
    const metadata = discoverUtilitySeries(data, resolveVisualizationFacilities(changed, data.facilities).scope, changed.sources[0] as UtilityVisualizationSource);
    expect(resolveVisualizationSeries(changed, metadata).map(item => item.metadata.resourceGuid)).toEqual(['meter-b', 'meter-c', 'meter-a']);
  });
  it('keeps independent raw settings outside ownership reset targets and normalizes optional JSON', () => {
    const definition = selected('meter', ['meter-a']);
    const result = prepareDecisionChange(definition, { kind: 'facilities', selection: { kind: 'fixed', facilityGuids: ['facility-a'] } },
      { snapshot: snapshot(), invalidNodeIds: [decisionNodeId({ kind: 'data-settings', sourceId: 'source-1' })] });
    expect(result.state).toBe('apply'); if (result.state === 'unchanged') throw new Error('Expected facility edit.');
    expect(result.affectedNodeIds).not.toContain(decisionNodeId({ kind: 'source', sourceId: 'source-1' }));
    expect(result.affectedNodeIds).not.toContain(decisionNodeId({ kind: 'data-settings', sourceId: 'source-1' }));
    expect(result.affectedNodeIds).not.toContain(decisionNodeId({ kind: 'period' }));
    const cleaned = apply(definition, { kind: 'source-settings', sourceId: 'source-1', settings: { charge: undefined } });
    expect(Object.hasOwn(cleaned.sources[0], 'charge')).toBe(false);
  });
  it('requires confirmation before removing an unbound source with incomplete child input', () => {
    const initial = createVisualizationDefinition('Example', 'account-a', { kind: 'all' }, 'utility');
    const definition = apply(initial, { kind: 'add-source', sourceKind: 'predictor' });
    const result = prepareDecisionChange(definition, { kind: 'remove-source-kind', sourceKind: 'utility' },
      { snapshot: snapshot(), invalidNodeIds: [decisionNodeId({ kind: 'data-settings', sourceId: 'source-1' })] });
    expect(result.state).toBe('confirm');
    expect(definition.sources).toHaveLength(2);
  });
  it.each<VisualizationDecisionAction>([
    { kind: 'source-settings', sourceId: 'source-1', settings: { groupBy: 'facility', aggregation: 'sum' } },
    { kind: 'selection-mode', sourceId: 'source-1', mode: 'meter' },
    { kind: 'remove-source-kind', sourceKind: 'utility' }
  ])('reviews dormant customization before a destructive $kind change', action => {
    const rule = apply(selected('rule'), { kind: 'add-source', sourceKind: 'predictor' });
    const definition: VisualizationDefinition = { ...rule, series: rule.series.map(series => ({ ...series,
      overrides: [{ resourceGuid: 'meter-a', accountGuid: 'account-a', color: '#123456', traceType: 'bar' as const, order: 0 }] })) };
    const empty = { ...snapshot(), meters: [], meterData: [] };
    expect(projectMeterItems(definition, 'source-1', empty)).toEqual([]);
    const result = prepareDecisionChange(definition, action, { snapshot: empty });
    expect(result.state).toBe('confirm');
    if (result.state !== 'unchanged') expect(result.cleared).toContain('Customized item presentation');
    expect(definition.series[0].overrides?.[0].color).toBe('#123456');
  });
  it('adds renderable and editable items alongside exact declarations without duplicating siblings', () => {
    const selectedA = selected('meter', ['meter-a']);
    const definition: VisualizationDefinition = { ...selectedA, series: [{ id: 'exact-a', sourceId: 'source-1', metric: 'energy', resourceGuid: 'meter-a', axis: 'left', color: '#123456' }] };
    expect(prepareDecisionChange(definition, { kind: 'source-settings', sourceId: 'source-1', settings: {} }, { snapshot: snapshot() }).state).toBe('unchanged');
    const added = apply(definition, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-b', selected: true });
    const styled = apply(added, { kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'meter-b' }, changes: { traceType: 'bar', label: 'Second meter' } });
    const metadata = discoverUtilitySeries({ ...snapshot(), meterData: [...snapshot().meterData, reading({ guid: 'reading-b', meterId: 'meter-b' })] }, resolveVisualizationFacilities(styled, snapshot().facilities).scope, styled.sources[0] as UtilityVisualizationSource);
    const resolved = resolveVisualizationSeries(styled, metadata);
    expect(resolved.map(item => [item.metadata.resourceGuid, item.selected.traceType, item.selected.color])).toEqual([
      ['meter-a', 'line', '#123456'], ['meter-b', 'bar', undefined]
    ]);
    expect(projectMeterItems(styled, 'source-1', snapshot()).find(item => item.identity.resourceGuid === 'meter-b')?.appearance.label).toBe('Second meter');
    const removed = apply(styled, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: false });
    const restored = apply(removed, { kind: 'toggle-resource', sourceId: 'source-1', resourceId: 'meter-a', selected: true });
    expect(projectMeterItems(restored, 'source-1', snapshot()).find(item => item.identity.resourceGuid === 'meter-a')?.appearance.color).not.toBe('#123456');
  });
});
