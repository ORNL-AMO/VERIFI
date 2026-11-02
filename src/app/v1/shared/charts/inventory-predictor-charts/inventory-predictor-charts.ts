import { InventoryChartTrace, InventoryChartView } from '../inventory-chart-sheet/inventory-chart-sheet.models';

/** Align saved histories by month and occurrence, retaining duplicates without summing or conversion. */
export function combinePredictorCharts(charts: readonly InventoryChartView[]): InventoryChartView[] {
  if (!charts.length) return [];
  const months = new Map<number, Map<string, (number | null)[]>>();
  for (const chart of charts) for (const row of chart.rows) {
    const entries = months.get(row.sortValue) ?? new Map<string, (number | null)[]>();
    const values = entries.get(chart.id) ?? [];
    values.push(row.values[chart.id] ?? null);
    entries.set(chart.id, values); months.set(row.sortValue, entries);
  }
  const ordered = [...months].sort(([a], [b]) => a - b);
  const label = (time: number) => new Date(time).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const rows = ordered.flatMap(([time, entries]) => Array.from({ length: Math.max(...[...entries.values()].map(values => values.length)) }, (_, occurrence) => ({
    periodKey: `${time}:${occurrence}`, periodLabel: label(time), sortValue: time,
    values: Object.fromEntries(charts.map(chart => [chart.id, entries.get(chart.id)?.[occurrence] ?? null])),
    paddingMetricIds: charts.filter(chart => (entries.get(chart.id)?.length ?? 0) <= occurrence).map(chart => chart.id)
  })));
  const metrics = charts.flatMap(chart => chart.metrics.map<InventoryChartTrace>(trace => ({ ...trace,
    // Keep original units in labels, while the shared axis and value formatting use raw numbers.
    label: trace.label + (trace.unit ? ` (${trace.unit})` : ''),
    shortLabel: (trace.shortLabel ?? trace.label) + (trace.unit ? ` (${trace.unit})` : ''), unit: undefined
  })));
  return [{ id: 'predictor-comparison', title: 'Predictors', unit: 'Units ignored',
    coverage: ordered.length ? `${label(ordered[0][0])} – ${label(ordered.at(-1)![0])}` : 'No monthly data', rows, metrics }];
}
