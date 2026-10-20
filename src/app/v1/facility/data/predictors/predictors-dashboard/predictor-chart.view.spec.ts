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
  it('keeps units and empty histories explicit, disambiguates duplicate names by GUID, and orders flat entries deterministically', () => {
    const workspace = inventoryWorkspace(3);
    workspace.predictors.update(items => items.map(item => ({ ...item, name: 'Shared', unit: 'tons' })));
    workspace.predictorReadings.set([inventoryReading('p1'), inventoryReading('p3')]);
    const all = entries(workspace), charts = buildPredictorCharts(all, workspace.predictorReadings());
    expect(charts.map(chart => chart.title)).toEqual(['Shared (Standard; p1)', 'Shared (Chicago; p2)', 'Shared (Standard; p3)']);
    expect(charts[1].metrics).toEqual([]);
    expect(orderPredictorInventory([...all].reverse(), 'predictorName').map(entry => entry.guid)).toEqual(['p1', 'p2', 'p3']);
    expect(buildPredictorCharts(all, [])[0]).toMatchObject({ metrics: [], rows: [], coverage: 'No monthly data' });
    expect(buildPredictorCharts([], [])).toEqual([]);
  });
});
