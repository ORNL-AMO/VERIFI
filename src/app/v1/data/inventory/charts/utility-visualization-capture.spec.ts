import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { calendarizedMeter, group, meter, monthlyData, reading } from '@app/v1/data/meters/facility-meters.testing';
import { buildInventoryMeterCharts } from '@app/v1/data/meters/inventory/charts/meter-inventory-charts';
import { captureInventoryUtility } from './utility-visualization-capture';
import type { InventoryUtilityCaptureInput } from './utility-visualization-capture';
import { discoverUtilitySeries } from '@domain/visualizations/utility/utility-catalog';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';

describe('inventory utility capture fidelity', () => {
  function setup(grouping: InventoryUtilityCaptureInput['grouping'] = 'meters', measure = 'energy'): InventoryUtilityCaptureInput {
    const original = visualizationSnapshot(), selectedMeter = meter({ groupId: 'group-a', meterReadingDataApplication: 'fullMonth' });
    const snapshot = { ...original, account: { ...original.account, energyUnit: 'kWh', energyIsSource: false, volumeLiquidUnit: 'gal', fiscalYear: 'calendarYear' as const },
      facilities: original.facilities.map(facility => ({ ...facility, energyUnit: 'kWh', volumeLiquidUnit: 'gal', energyIsSource: false })),
      meters: [selectedMeter], meterGroups: [group({ guid: 'group-a' })], meterData: [reading({ totalEnergyUse: 0, totalCost: 20 })] };
    const projectedMeters = [calendarizedMeter(selectedMeter, [monthlyData({ year: 2026, monthNumValue: 0, date: new Date(2026, 0, 1), energyUse: 0, energyConsumption: 0, energyCost: 20 })], { energyUnit: 'kWh', consumptionUnit: 'kWh' })];
    const chart = buildInventoryMeterCharts(projectedMeters, snapshot.facilities, snapshot.meterGroups, grouping, 'kWh', 'gal').find(chart => chart.id === measure)!;
    return { snapshot, context: { accountGuid: snapshot.account.guid, facilityGuid: undefined, resource: 'meters' }, contextLabel: 'All facilities',
      selection: { state: 'supported', selection: { kind: 'rule', resource: 'meter', filter: { includeRetired: true } } }, matchingGuids: [selectedMeter.guid], chart,
      grouping, view: { metric: measure, hiddenGuids: [] }, projectedMeters, workspaceRevision: 1, calendarDate: '2026-11-12' };
  }
  it.each(['meters', 'groups', 'facilities'] as const)('captures %s with a live rule, durable styles, owner settings and actual zero', grouping => {
    const input = setup(grouping), before = structuredClone(input);
    const result = captureInventoryUtility(input);
    expect(result.state).toBe('supported');
    if (result.state !== 'supported') throw new Error(result.reasons.join(' '));
    expect(result.definition.sources[0]).toMatchObject({ selection: { kind: 'rule', resource: 'meter', filter: { includeRetired: true } }, settings: { unit: { kind: 'owner' }, energyTreatment: { kind: 'owner' } } });
    expect(result.definition.series[0].overrides[0]).toMatchObject({ resourceGuid: grouping === 'meters' ? 'meter-a' : grouping === 'groups' ? 'group-a' : 'facility-a', color: 'var(--v1-chart-series-1)', visible: true });
    expect(result.definition.period).toEqual({ kind: 'all-history' });
    expect(result.definition.appearance.legend).toBe(false);
    expect(JSON.stringify(result.definition)).not.toContain('zoom');
    expect(input).toEqual(before);
  });
  it('retains hidden resource overrides without snapshotting the matching rule', () => {
    const input = setup(), extra = meter({ guid: 'meter-b', groupId: 'group-a', meterReadingDataApplication: 'fullMonth' });
    const projectedMeters = [...input.projectedMeters, calendarizedMeter(extra, input.projectedMeters[0].monthlyData, { energyUnit: 'kWh', consumptionUnit: 'kWh' })];
    const snapshot = { ...input.snapshot, meters: [...input.snapshot.meters, extra], meterData: [...input.snapshot.meterData, reading({ meterId: 'meter-b', guid: 'bill-b', totalEnergyUse: 0 })] };
    const chart = buildInventoryMeterCharts(projectedMeters, snapshot.facilities, snapshot.meterGroups, 'meters', 'kWh', 'gal')[0];
    const result = captureInventoryUtility({ ...input, snapshot, projectedMeters, chart, matchingGuids: ['meter-a', 'meter-b'], view: { metric: 'energy', hiddenGuids: ['meter-b'] } });
    expect(result.state).toBe('supported');
    if (result.state === 'supported') expect(result.definition.series[0].overrides).toContainEqual(expect.objectContaining({ resourceGuid: 'meter-b', visible: false }));
  });
  it('retains alphabetic inventory trace order independently of provider GUID order, including hidden appearance', () => {
    const input = setup();
    const entries = [meter({ guid: 'meter-z', name: 'Alpha', meterReadingDataApplication: 'fullMonth' }),
      meter({ guid: 'meter-m', name: 'Bravo', meterReadingDataApplication: 'fullMonth' }),
      meter({ guid: 'meter-a', name: 'Zulu', meterReadingDataApplication: 'fullMonth' })];
    const snapshot = { ...input.snapshot, meters: entries,
      meterData: entries.map((meter, index) => reading({ guid: `bill-${index}`, meterId: meter.guid, totalEnergyUse: 0 })) };
    const projectedMeters = entries.map(meter => calendarizedMeter(meter, input.projectedMeters[0].monthlyData, { energyUnit: 'kWh', consumptionUnit: 'kWh' }));
    const chart = buildInventoryMeterCharts(projectedMeters, snapshot.facilities, snapshot.meterGroups, 'meters', 'kWh', 'gal')[0];
    expect(chart.metrics.map(trace => trace.id)).toEqual(['meter-z', 'meter-m', 'meter-a']);
    const result = captureInventoryUtility({ ...input, snapshot, projectedMeters, chart, matchingGuids: entries.map(meter => meter.guid), view: { metric: 'energy', hiddenGuids: ['meter-m'] } });
    expect(result.state).toBe('supported'); if (result.state !== 'supported') throw new Error(result.reasons.join(' '));
    const definition = result.definition, source = definition.sources[0] as UtilityVisualizationSource;
    if (input.selection?.state !== 'supported') throw new Error('Expected a matching-rule fixture.');
    expect(source.selection).toEqual(input.selection.selection);
    const discovery = discoverUtilitySeries(snapshot, definition.scope, source);
    expect(discovery.map(series => series.resourceGuid)).toEqual(['meter-a', 'meter-m', 'meter-z']);
    const all = resolveVisualizationSeries(definition, discovery, true);
    expect(all.map(item => item.metadata.resourceGuid)).toEqual(chart.metrics.map(trace => trace.id));
    for (const [index, item] of all.entries()) {
      const trace = chart.metrics[index];
      expect(item.selected).toMatchObject({ label: trace.label, color: trace.color, lineStyle: trace.lineStyle, visible: trace.id !== 'meter-m' });
    }
    expect(resolveVisualizationSeries(definition, discovery).map(item => item.metadata.resourceGuid)).toEqual(['meter-z', 'meter-a']);
    expect(definition.series[0].overrides.map(override => override.order)).toEqual([0, 1, 2]);
  });
  it('blocks unsupported search/status descriptors and membership changes without rewriting intent', () => {
    const input = setup();
    expect(captureInventoryUtility({ ...input, selection: { state: 'unsupported', reason: 'Clear Status filters' } })).toEqual({ state: 'unsupported', reasons: ['Clear Status filters'] });
    expect(captureInventoryUtility({ ...input, matchingGuids: [] }).state).toBe('unsupported');
    expect(captureInventoryUtility({ ...input, selection: undefined }).state).toBe('unsupported');
  });
  it('blocks normalized cost zeros, partial totals and changed units instead of capturing a misleading chart', () => {
    const input = setup('meters', 'cost');
    expect(captureInventoryUtility({ ...input, snapshot: { ...input.snapshot, meterData: input.snapshot.meterData.map(bill => ({ ...bill, totalCost: undefined })) } }).state).toBe('unsupported');
    expect(captureInventoryUtility({ ...input, chart: { ...input.chart, unit: 'EUR' } }).state).toBe('unsupported');
    expect(captureInventoryUtility({ ...input, snapshot: { ...input.snapshot, meterData: input.snapshot.meterData.map(bill => ({ ...bill, isEstimated: true })) } }).state).toBe('unsupported');
  });
  it('explains unassigned identities and unsupported dash patterns', () => {
    const input = setup('groups'), withoutGroup = { ...input.snapshot, meters: input.snapshot.meters.map(meter => ({ ...meter, groupId: undefined })), meterGroups: [] };
    const projection = input.projectedMeters.map(item => ({ ...item, meter: { ...item.meter, groupId: undefined } }));
    const chart = buildInventoryMeterCharts(projection, withoutGroup.facilities, [], 'groups', 'kWh', 'gal')[0];
    const result = captureInventoryUtility({ ...input, snapshot: withoutGroup, projectedMeters: projection, chart });
    expect(result.state).toBe('unsupported');
    if (result.state === 'unsupported') expect(result.reasons.join(' ')).toContain('Individual meters');
    expect(captureInventoryUtility({ ...input, chart: { ...input.chart, metrics: input.chart.metrics.map(trace => ({ ...trace, lineStyle: [8, 4] })) } }).state).toBe('unsupported');
  });
});
