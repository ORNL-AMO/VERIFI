import type { V1EChartsOption, V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import type { TimeSeriesModel, TimeSeriesPoint } from './time-series.models';

export function observationText(point: TimeSeriesPoint, unit: string): string {
  const observation = point.observation;
  if (observation.state !== 'observed') return `${observation.state}: ${observation.reason}`;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(observation.value)} ${unit} · ${observation.provenance}${observation.partial ? ' · partial subtotal' : ''}`;
}

/** Options are runtime presentation only; a missing observation remains an explicit gap. */
export function timeSeriesOption(model: TimeSeriesModel, zoom: V1EChartsDataZoomRange = { start: 0, end: 100 }): V1EChartsOption {
  const axes = (['left', 'right'] as const).filter(axis => model.traces.some(trace => trace.axis === axis));
  const labels = new Map(model.slots.map(slot => [slot.key, slot.label]));
  const points = new Map(model.traces.map(trace => [trace.id, new Map(trace.points.map(point => [point.slot, point]))]));
  return {
    animation: false,
    aria: { enabled: true, label: { description: `${model.title}. Exact values, original periods and observation quality are available in the accessible data table.` } },
    legend: { show: model.legend, type: 'scroll', top: 0, data: model.traces.map(trace => trace.label), selectedMode: false },
    grid: { top: model.legend ? 64 : 28, left: 20, right: 20, bottom: 72, containLabel: true },
    xAxis: { type: 'category', data: model.slots.map(slot => slot.key), axisLabel: { formatter: (key: string) => labels.get(key) ?? key } },
    yAxis: axes.length ? axes.map(axis => ({ type: 'value' as const, position: axis, name: model.traces.find(trace => trace.axis === axis)?.unit,
      scale: !model.traces.some(trace => trace.axis === axis && trace.type === 'bar') })) : [{ type: 'value' as const }],
    tooltip: { trigger: 'axis', renderMode: 'richText', confine: true, formatter: (value: unknown) => {
      const items = (Array.isArray(value) ? value : [value]) as { seriesId?: string; axisValue?: string }[];
      const lines = items.flatMap(item => {
        const trace = model.traces.find(trace => trace.id === item.seriesId), point = trace && points.get(trace.id)?.get(String(item.axisValue));
        return trace && point ? [`${trace.label}: ${observationText(point, trace.unit)} (${point.start} – ${point.end})`] : [];
      });
      return lines.join('\n');
    } },
    dataZoom: model.slots.length > 2 ? [{ type: 'inside', start: zoom.start, end: zoom.end }, { type: 'slider', start: zoom.start, end: zoom.end, bottom: 12, height: 24 }] : [],
    series: model.traces.map(trace => ({ id: trace.id, name: trace.label, type: trace.type,
      yAxisIndex: axes.indexOf(trace.axis), connectNulls: false, smooth: false, showSymbol: true, symbolSize: 5,
      data: trace.points.filter(point => point.observation.state !== 'alignment-padding').map(point => [point.slot, point.observation.state === 'observed' ? point.observation.value : null]),
      itemStyle: { color: trace.color }, lineStyle: { color: trace.color, type: trace.role === 'comparison' ? 'dashed' : trace.lineStyle, width: 2 },
      emphasis: { focus: 'series' }
    }))
  } as V1EChartsOption;
}
