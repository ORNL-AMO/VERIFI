import { buildPredictorInventory, orderPredictorInventory } from '../predictor-inventory/predictor-inventory.models';
import { inventoryReading, inventoryWorkspace } from '../predictor-inventory/predictor-inventory.testing';
import { buildPredictorCharts } from './predictor-chart.view';

function entries(workspace: ReturnType<typeof inventoryWorkspace>) {
  return buildPredictorInventory(workspace.predictorCards(), workspace.weatherStationGroups(), workspace.facility()!, 'ready');
}
describe('Predictor chart projection', () => {
  it('gives every predictor its own tab, uses implied weather units and includes all saved history independently of cards', () => {
    const workspace = inventoryWorkspace();
    workspace.predictors.update(items => items.map(item => item.guid === 'p2' ? { ...item, unit: '' } : item));
    const charts = buildPredictorCharts(entries(workspace), workspace.predictorReadings());
    expect(charts.map(chart => chart.unit)).toEqual(['tons', 'days', 'tons']);
    expect(charts.map(chart => chart.id)).toEqual(['p1', 'p2', 'p3']);
    expect(charts.every(chart => chart.metrics.length === 1)).toBe(true);
    expect(charts.find(chart => chart.unit === 'days')!.rows[0].values['p2']).toBe(12);
  });
  it('preserves duplicate records, gaps, zeros and negatives while rejecting invalid or foreign reading relationships', () => {
    const workspace = inventoryWorkspace(1), entry = entries(workspace)[0];
    const charts = buildPredictorCharts([entry], [
      inventoryReading('p1', { guid: 'a', amount: 0 }), inventoryReading('p1', { guid: 'b', amount: -5 }),
      inventoryReading('p1', { guid: 'c', month: 4, amount: 7 }), inventoryReading('p1', { month: 99 }),
      inventoryReading('p1', { accountId: 'other' }), inventoryReading('p1', { facilityId: 'other' }),
      inventoryReading('other', { amount: 999 })
    ]);
    expect(charts[0].rows.map(row => row.values['p1'])).toEqual([0, -5, null, null, 7]);
    expect(charts[0].coverage).toBe('Jan 2025 – Apr 2025');
    expect(new Set(charts[0].rows.map(row => row.periodKey)).size).toBe(5);
  });
  it('keeps units and empty histories explicit and distinguishes same-facility duplicates without displaying GUIDs', () => {
    const workspace = inventoryWorkspace(3);
    workspace.predictors.update(items => items.map(item => ({ ...item, name: 'Shared', unit: 'tons' })));
    workspace.predictorReadings.set([inventoryReading('p1'), inventoryReading('p3')]);
    const all = entries(workspace), charts = buildPredictorCharts(all, workspace.predictorReadings());
    expect(charts.map(chart => chart.title)).toEqual(['Shared (Standard 1)', 'Shared (Chicago)', 'Shared (Standard 2)']);
    expect(buildPredictorCharts([...all].reverse(), []).map(chart => chart.title)).toEqual(charts.map(chart => chart.title));
    expect(charts.map(chart => chart.id)).toEqual(['p1', 'p2', 'p3']);
    expect(charts[1].metrics).toEqual([]);
    expect(orderPredictorInventory([...all].reverse(), 'predictorName').map(entry => entry.guid)).toEqual(['p1', 'p2', 'p3']);
    expect(buildPredictorCharts(all, [])[0]).toMatchObject({ metrics: [], rows: [], coverage: 'No monthly data' });
    expect(buildPredictorCharts([], [])).toEqual([]);
  });
  it('does not add type or GUID suffixes for the same predictor name in different facilities', () => {
    const workspace = inventoryWorkspace(1), entry = entries(workspace)[0];
    const other = { ...entry, guid: 'other-guid', facility: { ...entry.facility, guid: 'other-facility', name: 'Other plant' },
      card: { ...entry.card, predictor: { ...entry.card.predictor, guid: 'other-guid', facilityId: 'other-facility' } } };
    const charts = buildPredictorCharts([entry, other], []);
    expect(charts.map(chart => chart.title)).toEqual([entry.card.predictor.name, entry.card.predictor.name]);
    expect(charts.map(chart => chart.id)).toContain('other-guid');
  });
});
