import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { discoverEquipmentSeries } from '@domain/visualizations/energy-use/equipment-source';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';
import { prepareDecisionChange } from '../decisions/decision-tree';
import { configuredChartSummary, projectDecisionItems } from './configured-items';

describe('saved item ordering', () => {
  const snapshot = equipmentSnapshot([equipmentFixture(), equipmentFixture({ guid: 'equipment-b', name: 'Boiler' })]);
  function move(definition: VisualizationDefinition): VisualizationDefinition {
    const result = prepareDecisionChange(definition, { kind: 'item-order', sourceId: 'source-1', item: { resourceGuid: 'equipment-b' }, direction: 'up' }, { snapshot });
    expect(result.state).toBe('apply');
    if (result.state === 'unchanged') throw new Error();
    return result.definition;
  }
  it('orders settings and runtime consistently and keeps new members after configured members', () => {
    const original = equipmentDefinition(['equipment-a', 'equipment-b']);
    const ordered = move(original);
    expect(ordered.sources).toEqual(original.sources);
    expect(projectDecisionItems(ordered, 'source-1', snapshot).map(item => item.identity.resourceGuid)).toEqual(['equipment-b', 'equipment-a']);
    const source = ordered.sources[0]; if (source.kind !== 'energy-use') throw new Error();
    const metadata = discoverEquipmentSeries(snapshot, resolveVisualizationFacilities(ordered, snapshot.facilities).scope, source);
    expect(resolveVisualizationSeries(ordered, metadata).map(item => item.metadata.resourceGuid)).toEqual(['equipment-b', 'equipment-a']);
    const expanded = { ...ordered, sources: ordered.sources.map(source => source.kind === 'energy-use' ? { ...source,
      selection: { kind: 'fixed' as const, resource: 'equipment' as const, guids: ['equipment-c', 'equipment-a', 'equipment-b'] } } : source) };
    const added = { ...snapshot, energyUseEquipment: [equipmentFixture({ guid: 'equipment-c', name: 'Chiller' }), ...snapshot.energyUseEquipment] };
    expect(projectDecisionItems(expanded, 'source-1', added).map(item => item.identity.resourceGuid)).toEqual(['equipment-b', 'equipment-a', 'equipment-c']);
  });

  it('resets current and dormant order only, preserving appearance and foreign preferences', () => {
    const original = equipmentDefinition(['equipment-a', 'equipment-b']);
    const ordered = move({ ...original, series: original.series.map(series => ({ ...series, color: '#123456', overrides: [
      { resourceGuid: 'departed', order: 3, label: 'Retain dormant appearance' },
      { resourceGuid: 'foreign', accountGuid: 'other-account', order: 2, color: '#654321' }
    ] })) });
    const result = prepareDecisionChange(ordered, { kind: 'reset-order', sourceId: 'source-1' }, { snapshot });
    if (result.state === 'unchanged') throw new Error();
    expect(result.definition.series[0].color).toBe('#123456');
    expect(result.definition.series[0].overrides).toContainEqual({ resourceGuid: 'departed', label: 'Retain dormant appearance' });
    expect(result.definition.series[0].overrides).toContainEqual({ resourceGuid: 'foreign', accountGuid: 'other-account', order: 2, color: '#654321' });
    expect(projectDecisionItems(result.definition, 'source-1', snapshot).map(item => item.identity.resourceGuid)).toEqual(['equipment-a', 'equipment-b']);
  });

  it('summarizes retained area, combinations and stacking without calculating observations', () => {
    const original = equipmentDefinition(['equipment-a', 'equipment-b']);
    const area: VisualizationDefinition = { ...original, chart: { kind: 'time-series', defaultTraceType: 'area', interval: 'yearly', stack: 'percent' } };
    expect(configuredChartSummary(area, snapshot)).toBe('Area · Percentage stack');
    expect(configuredChartSummary({ ...area, series: area.series.map(series => ({ ...series, overrides: [{ resourceGuid: 'equipment-b', traceType: 'bar', visible: false }] })) }, snapshot)).toBe('Combination · Percentage stack');
  });
});
