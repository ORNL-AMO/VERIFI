import { compositionFixture, equipmentCompositionEvidence } from '@domain/visualizations/testing/composition-fixtures';
import { compositionOption } from './composition-options';
import { compositionPercent, prepareComposition } from './composition.models';
import type { UtilityVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEvidence, VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { utilityCapabilities, utilityChartSupport } from '@domain/visualizations/utility/utility-capabilities';
import { checkVisualizationCompatibility } from '@domain/visualizations/visualization-capabilities';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { meter, reading, monthlyData, calendarizedMeter } from '@app/v1/data/meters/facility-meters.testing';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { prepareDecisionChange } from '../decisions/decision-tree';

describe('composition presentation', () => {
  it.each(['treemap', 'sunburst'] as const)('uses identical %s leaf totals and preserves source details, zero and missing values', kind => {
    const { snapshot, definition } = compositionFixture({ kind, hierarchy: ['group', 'equipment'], values: 'percent' });
    const evidence = equipmentCompositionEvidence(snapshot, definition), model = prepareComposition(definition, [evidence]);
    const root = model.nodes.find(node => !node.parentId)!;
    expect(root.amount).toBeCloseTo(10.01); expect(root.description).toContain('known values only');
    expect(model.nodes.find(node => node.label === 'Small positive share')!.description).toContain('<1%');
    expect(model.details.rows).toHaveLength(4); expect(model.details.rows.flat().join(' ')).toContain('FY 2024');
    expect((compositionOption(model).series as any[])[0]).toMatchObject({ type: kind, nodeClick: false });
    expect((compositionOption(model).series as any[])[0].data[0].children).toHaveLength(2);
  });
  it('keeps full-scope denominators stable when selected items are hidden and keeps their original details', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'breakdown', type: 'donut', values: 'percent' });
    const evidence = equipmentCompositionEvidence(snapshot, definition);
    const full = prepareComposition(definition, [evidence]);
    const hidden: VisualizationDefinition = { ...definition, series: definition.series.map(series => ({ ...series, overrides: [{ resourceGuid: 'equipment-a', visible: false }] })) };
    const model = prepareComposition(hidden, [evidence]);
    expect(model.nodes.find(node => node.label === 'Small positive share')!.percentage).toBe(full.nodes.find(node => node.label === 'Small positive share')!.percentage);
    expect(model.nodes.find(node => node.label === 'Small positive share')!.description).toContain('100% of selected');
    expect(model.details.rows).toHaveLength(4);
    expect((compositionOption(model).series as any[])[0].data).toHaveLength(1);
    expect(compositionPercent(0)).toBe('0%'); expect(compositionPercent(.0001)).toBe('<1%');
  });
  it('honors saved item order in hierarchies without changing the original occurrence evidence', () => {
    const { snapshot, definition } = compositionFixture();
    const ordered: VisualizationDefinition = { ...definition, series: definition.series.map(series => ({ ...series, overrides: [{ resourceGuid: 'small', order: 0 }] })) };
    const evidence = equipmentCompositionEvidence(snapshot, ordered), before = structuredClone(evidence);
    const model = prepareComposition(ordered, [evidence]);
    expect(model.nodes.filter(node => node.parentId).map(node => node.label).slice(0, 2)).toEqual(['Small positive share', 'Pump']);
    expect(evidence).toEqual(before);
  });
});

describe('utility composition presentation identities', () => {
  function setup(bySource = false) {
    const meters = bySource ? [meter({ meterReadingDataApplication: 'fullMonth' })] : [
      meter({ guid: 'a-gallons', source: 'Other', startingUnit: 'gal', meterReadingDataApplication: 'fullMonth' }),
      meter({ guid: 'b-cubic-feet', source: 'Other', startingUnit: 'ft3', meterReadingDataApplication: 'fullMonth' })
    ];
    const snapshot = { ...visualizationSnapshot(), meters,
      meterData: meters.map(item => reading({ guid: `reading-${item.guid}`, meterId: item.guid, totalVolume: 10 })) };
    const source: UtilityVisualizationSource = { id: 'utility', kind: 'utility', selectionMode: bySource ? 'source' : 'meter',
      measure: bySource ? 'energy' : 'consumption', aggregation: bySource ? 'sum' : 'none', groupBy: bySource ? 'source' : 'meter', dataMode: 'calendarized',
      selection: bySource ? { kind: 'rule', resource: 'meter', filter: { utilitySources: ['Electricity'] } }
        : { kind: 'fixed', resource: 'meter', guids: meters.map(item => item.guid) } };
    const definition: VisualizationDefinition = { ...utilityVisualizationFixture(), sources: [source],
      chart: { kind: 'breakdown', type: 'bar', values: 'absolute' },
      period: { kind: 'fixed', start: '2026-01-01', end: '2026-01-31', basis: 'calendar' }, comparison: { kind: 'none' },
      series: [{ id: 'selected', sourceId: source.id, metric: source.measure, axis: 'left', overrides: bySource
        ? [{ seriesId: 'utility:source:Electricity', label: 'Grid power' }] : [{ resourceGuid: 'a-gallons', visible: false }] }] };
    const canonical = meters.map(item => calendarizedMeter(item, [monthlyData({ energyConsumption: 10, energyUse: 10 })],
      { energyUnit: 'kWh', consumptionUnit: item.startingUnit }));
    const evidence = (intent: VisualizationDefinition): VisualizationSourceEvidence => {
      const request: VisualizationSourceRequest = { identity: { accountGuid: snapshot.account.guid, workspaceRevision: 1, definitionGuid: 'composition', definitionRevision: 1,
        requestId: 'composition', sourceId: source.id, scope: resolveVisualizationFacilities(intent, snapshot.facilities).scope },
        source, chart: intent.chart!, period: intent.period, comparison: intent.comparison, series: intent.series, dateContext: { calendarDate: '2026-11-17' } };
      return { request, resolution: resolveCalendarizedUtility(snapshot, request, canonical), capabilities: utilityCapabilities(source), chartSupport: utilityChartSupport(source, request.chart) };
    };
    return { snapshot, definition, evidence };
  }
  it.each(['bar', 'donut', 'treemap', 'sunburst'] as const)('uses the visible meter unit in %s while preserving hidden source units', kind => {
    const { definition, evidence } = setup();
    const intent: VisualizationDefinition = { ...definition, chart: kind === 'bar' || kind === 'donut' ? { kind: 'breakdown', type: kind, values: 'absolute' }
      : { kind, hierarchy: ['source', 'meter'], values: 'absolute' } };
    const resolved = evidence(intent);
    expect(resolved.resolution.state).toBe('ready');
    expect(checkVisualizationCompatibility(intent, [resolved]).state).toBe('compatible');
    const model = prepareComposition(intent, [resolved]);
    expect(model.unit).toBe('ft3');
    expect(model.nodes.every(node => node.description.includes('10 ft3'))).toBe(true);
    expect(model.details.rows.flat().join(' ')).toContain('10 gal');
    expect(model.details.rows.flat().join(' ')).toContain('10 ft3');
    expect((compositionOption(model) as any).xAxis?.name ?? model.unit).toBe('ft3');
  });
  it.each(['treemap', 'sunburst'] as const)('keeps a Source-category custom label when converting breakdown to %s', kind => {
    const { snapshot, definition, evidence } = setup(true), before = structuredClone(snapshot);
    expect(prepareComposition(definition, [evidence(definition)]).nodes[0].label).toBe('Grid power');
    const converted = prepareDecisionChange(definition, { kind: 'chart', chart: { kind, hierarchy: [], values: 'absolute' } }, { snapshot });
    expect(converted.state).toBe('apply'); if (converted.state === 'unchanged') throw new Error('Expected chart conversion');
    const resolved = evidence(converted.definition), original = structuredClone(resolved);
    expect(checkVisualizationCompatibility(converted.definition, [resolved]).state).toBe('compatible');
    const model = prepareComposition(converted.definition, [resolved]);
    expect(model.nodes.some(node => node.label === 'Grid power')).toBe(true);
    expect(model.nodes.some(node => node.label === 'Electricity')).toBe(false);
    expect(model.details.rows.flat().join(' ')).toContain('Electricity');
    expect(resolved).toEqual(original); expect(snapshot).toEqual(before);
  });
});
