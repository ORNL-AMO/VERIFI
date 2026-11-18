import type { TimeSeriesModel } from './time-series.models';
import { timeSeriesOption } from './time-series-options';

describe('saved line/bar chart options', () => {
  it('uses saved smoothing only for line geometry, retaining gaps and the existing default', () => {
    const line = model('line'), smooth = { ...line, chart: { ...line.chart, smoothLines: true } };
    expect((timeSeriesOption(smooth) as any).series[0]).toMatchObject({ smooth: true, connectNulls: false });
    expect((timeSeriesOption(line) as any).series[0].smooth).toBe(false);
    expect((timeSeriesOption({ ...smooth, traces: smooth.traces.map(trace => ({ ...trace, type: 'bar' as const })) }) as any).series[0].smooth).toBe(false);
  });
  function model(type: 'line' | 'bar'): TimeSeriesModel {
    return { title: 'Energy', chart: { kind: 'time-series', defaultTraceType: type, interval: 'monthly', stack: 'none' }, legend: true,
      slots: ['a', 'b', 'c', 'd'].map((key, order) => ({ key, label: key, order })), warnings: [], traces: [{ id: 'energy', type, label: 'Energy', unit: 'kWh', axis: 'left', color: 'var(--v1-chart-series-1)', lineStyle: 'solid', role: 'primary', points: [
        { slot: 'a', start: '2026-01-01', end: '2026-01-31', observation: { state: 'observed', value: 0, provenance: 'measured', partial: false } },
        { slot: 'b', start: '2026-02-01', end: '2026-02-28', observation: { state: 'missing', value: null, reason: 'Missing saved data' } },
        { slot: 'c', start: '2026-03-01', end: '2026-03-31', observation: { state: 'alignment-padding', value: null, reason: 'No native comparison slot' } },
        { slot: 'd', start: '2026-04-01', end: '2026-04-30', observation: { state: 'observed', value: -5, provenance: 'measured', partial: true } }
      ] }] };
  }
  it.each(['line', 'bar'] as const)('preserves zero, negative and true gaps for %s, omitting alignment padding', type => {
    const option = timeSeriesOption(model(type)) as any;
    expect(option.series[0].type).toBe(type);
    expect(option.series[0].data).toEqual([['a', 0], ['b', null], ['d', -5]]);
    expect(option.series[0].connectNulls).toBe(false);
    expect(option.series[0].smooth).toBe(false);
  });
  it('renders mixed item types and includes zero only on axes containing bars', () => {
    const selected = model('line');
    const line = selected.traces[0];
    const mixed: TimeSeriesModel = { ...selected, traces: [line,
      { ...line, id: 'bar', label: 'Bar', type: 'bar' },
      { ...line, id: 'right-line', label: 'Right line', axis: 'right' }] };
    const option = timeSeriesOption(mixed) as any;
    expect(option.series.map((series: any) => series.type)).toEqual(['line', 'bar', 'line']);
    expect(option.yAxis).toEqual([expect.objectContaining({ position: 'left', scale: false }), expect.objectContaining({ position: 'right', scale: true })]);
    expect(option.series[1].data).toEqual([['a', 0], ['b', null], ['d', -5]]);
  });
  it('omits mixed-unit axis labels, retains each tooltip unit, and restores labels when traces move or hide', () => {
    const selected = model('line'), first = selected.traces[0];
    const mixed: TimeSeriesModel = { ...selected, traces: [first, { ...first, id: 'temperature', label: 'Temperature', unit: '°F' }] };
    const options = timeSeriesOption(mixed) as any;
    expect(options.yAxis[0].name).toBe('');
    expect(options.tooltip.formatter([{ seriesId: 'energy', axisValue: 'a' }, { seriesId: 'temperature', axisValue: 'a' }])).toContain('0 kWh');
    expect(options.tooltip.formatter([{ seriesId: 'temperature', axisValue: 'a' }])).toContain('0 °F');
    const split = timeSeriesOption({ ...mixed, traces: [first, { ...mixed.traces[1], axis: 'right' }] }) as any;
    expect(split.yAxis.map((axis: any) => axis.name)).toEqual(['kWh', '°F']);
    expect((timeSeriesOption({ ...mixed, traces: [first] }) as any).yAxis[0].name).toBe('kWh');
  });
  it('keeps zoom transient and supplies original dates and quality in tooltips', () => {
    const selected = model('line'), snapshot = structuredClone(selected), option = timeSeriesOption(selected, { start: 25, end: 75 }) as any;
    expect(option.dataZoom[0]).toMatchObject({ start: 25, end: 75 });
    expect(option.tooltip.formatter([{ seriesId: 'energy', axisValue: 'd' }])).toContain('partial subtotal (2026-04-01 – 2026-04-30)');
    expect(selected).toEqual(snapshot);
  });
});
