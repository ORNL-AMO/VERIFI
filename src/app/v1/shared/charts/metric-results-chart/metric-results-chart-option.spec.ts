import { metricResultsChartOption } from './metric-results-chart-option';

describe('metricResultsChartOption', () => {
  const metrics = [{ id: 'use', label: 'Consumption', unit: 'kWh' }, { id: 'cost', label: 'Cost', currency: true }];
  const rows = [
    { periodKey: '1', periodLabel: 'January', sortValue: 1, values: { use: 12, cost: 5 } },
    { periodKey: '2', periodLabel: 'February', sortValue: 2, values: { use: null, cost: 7 } },
    { periodKey: '3', periodLabel: 'March', sortValue: 3, values: { use: 15, cost: 9 } }
  ];

  it('preserves genuine gaps and independent axis formats without changing its inputs', () => {
    const original = structuredClone(rows);
    const option = metricResultsChartOption({ rows, metrics, leftMetricId: 'use', rightMetricId: 'cost' }) as any;
    expect(option.series.map((series: any) => series.data)).toEqual([[12, null, 15], [5, 7, 9]]);
    expect(option.series.every((series: any) => series.connectNulls === false)).toBe(true);
    expect(option.yAxis[1].axisLabel.formatter).toBe('${value}');
    expect(option.tooltip.formatter([{ seriesName: 'Cost', value: 5.125 }])).toContain('$5.13');
    expect(rows).toEqual(original);
  });

  it('preserves projected alignment padding separately from missing observations', () => {
    const option = metricResultsChartOption({
      rows: [rows[0], { ...rows[1], paddingMetricIds: ['use'] }, rows[2], { ...rows[2], values: { use: null, cost: 0 } }],
      metrics, allMetrics: true
    }) as any;
    expect(option.series[0].data).toEqual([[0, 12], [2, 15], [3, null]]);
    expect(option.series[0].encode).toEqual({ x: 0, y: 1 });
    expect(option.series[1].data).toEqual([5, 7, 9, 0]);
  });

  it('retains custom comparison shading and omits segments across a missing observation', () => {
    const option = metricResultsChartOption({ rows, metrics, allMetrics: true,
      comparisonBand: { referenceMetricId: 'use', comparisonMetricId: 'cost', comparisonAboveColor: 'green', referenceAboveColor: 'red' }
    }) as any;
    expect(option.series.slice(0, 2).map((series: any) => series.type)).toEqual(['custom', 'custom']);
    expect(option.series[0].data).toEqual([]);
    expect(option.series[0].renderItem).toEqual(expect.any(Function));
    expect(option.series[2].smooth).toBe(false);
  });
});
