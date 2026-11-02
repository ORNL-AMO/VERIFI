import { buildPredictorInventoryCharts, combinePredictorCharts } from './predictor-inventory-charts';
import { InventoryChartView } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { inventoryWorkspace, inventoryReading } from '../predictor-inventory.testing';

function history(id: string, unit: string, samples: readonly [number, number | null][]): InventoryChartView {
  return { id, title: id, unit, coverage: '', metrics: [{ id, label: `Plant / ${id}`, shortLabel: id, facilityGuid: 'plant', facilityName: 'Plant', kind: 'predictor', unit }],
    rows: samples.map(([month, value], index) => ({ periodKey: `${id}-${index}`, periodLabel: '', sortValue: Date.UTC(2025, month), values: { [id]: value } })) };
}
describe('multiple saved predictor histories', () => {
  it('prepares every matching saved history with explicit ownership and retains selectable empty histories', () => {
    const workspace = inventoryWorkspace(3), facility = workspace.facility()!;
    const readings = [inventoryReading('p1', { amount: 0 })];
    const before = structuredClone(workspace.predictors());
    const charts = buildPredictorInventoryCharts([facility], workspace.predictors(), readings, ['p1', 'p2']);
    expect(charts.map(chart => chart.id)).toEqual(['p1', 'p2']);
    expect(charts[0].rows[0].values['p1']).toBe(0);
    expect(charts[0].metrics[0]).toMatchObject({ facilityGuid: facility.guid, facilityName: facility.name, kind: 'predictor' });
    expect(charts[1]).toMatchObject({ rows: [], coverage: 'No monthly data' });
    expect(charts[1].metrics).toHaveLength(1);
    expect(charts[1].metrics[0].id).toBe('p2');
    expect(charts[1].title).toContain(facility.name);
    expect(workspace.predictors()).toEqual(before);
  });
  it('marks alignment-only slots separately from a predictor’s real missing month', () => {
    const charts = [history('duplicates', 'tons', [[0, 1], [0, 2], [1, 3]]),
      history('complete', '°F', [[0, 10], [1, 20], [2, null], [3, 30]])];
    const chart = combinePredictorCharts(charts)[0];
    expect(chart.rows.filter(row => !row.paddingMetricIds?.includes('complete')).map(row => row.values['complete'])).toEqual([10, 20, null, 30]);
    expect(chart.rows[1].paddingMetricIds).toContain('complete');
    expect(chart.rows[3].paddingMetricIds).not.toContain('complete');
    expect(chart.rows.filter(row => !row.paddingMetricIds?.includes('duplicates')).map(row => row.values['duplicates'])).toEqual([1, 2, 3]);
  });
  it('aligns months and duplicates without aggregating, converting, normalizing or filling gaps', () => {
    const histories = [history('production', 'tons', [[0, 0], [0, -5], [1, null], [2, 7]]), history('temperature', '°F', [[0, 50], [1, 60], [2, null], [3, 70]])];
    const before = structuredClone(histories), chart = combinePredictorCharts(histories)[0];
    expect(chart.rows.map(row => row.values)).toEqual([
      { production: 0, temperature: 50 }, { production: -5, temperature: null },
      { production: null, temperature: 60 }, { production: 7, temperature: null }, { production: null, temperature: 70 }
    ]);
    expect(new Set(chart.rows.map(row => row.periodKey)).size).toBe(5);
    expect(chart.coverage).toBe('Jan 2025 – Apr 2025'); expect(chart.unit).toBe('Units ignored');
    expect(chart.metrics.map(trace => trace.unit)).toEqual([undefined, undefined]);
    expect(chart.metrics.map(trace => trace.label)).toEqual(['Plant / production (tons)', 'Plant / temperature (°F)']);
    expect(chart.metrics[0]).toMatchObject({ facilityGuid: 'plant', shortLabel: 'production (tons)' });
    expect(histories).toEqual(before);
  });
  it('keeps percentage samples as saved numbers and represents empty histories explicitly', () => {
    const chart = combinePredictorCharts([history('rate', '%', [[0, .25]]), history('empty', '', [])])[0];
    expect(chart.rows[0].values).toEqual({ rate: .25, empty: null });
    expect(chart.metrics[0].unit).toBeUndefined(); expect(chart.metrics[0].label).toContain('(%)');
    expect(combinePredictorCharts([history('empty', '', [])])[0]).toMatchObject({ rows: [], coverage: 'No monthly data' });
    expect(combinePredictorCharts([])).toEqual([]);
  });
});
