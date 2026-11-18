import type { V1EChartsOption } from '@app/v1/shared/charts/echarts';
import { compositionFlow, compositionNumber, compositionPercent, type CompositionModel } from './composition.models';
import { visualizationSeriesStyle } from '../shared/series-style';

/** ECharts consumes positive geometry only. The model/details retain every original value. */
export function compositionOption(model: CompositionModel, rootId = ''): V1EChartsOption {
  const chart = model.chart, percent = 'values' in chart && chart.values === 'percent';
  const tooltip: V1EChartsOption['tooltip'] = { trigger: 'item', renderMode: 'richText', confine: true, formatter: value => {
    const point = (Array.isArray(value) ? value[0] : value).data as { description?: string }; return point?.description ?? '';
  } };
  const base: V1EChartsOption = { animation: false, tooltip, aria: { enabled: true }, textStyle: { color: 'var(--v1-text)' } };
  if (chart.kind === 'breakdown') {
    const nodes = model.nodes, data = nodes.map(node => ({ id: node.id, name: node.label, value: chart.type === 'bar' && percent ? node.percentage : node.amount,
      description: node.description, itemStyle: { color: node.color }, label: { formatter: `${node.label}\n${percent ? compositionPercent(node.percentage) : node.amount === null ? 'Unavailable' : compositionNumber(node.amount) + ' ' + model.unit}` } }));
    if (chart.type === 'donut') return { ...base, legend: { show: model.legend, selectedMode: false, type: 'scroll', bottom: 0, textStyle: { color: 'var(--v1-text)' } },
      series: [{ type: 'pie', radius: ['40%', '65%'], top: 20, bottom: 60, avoidLabelOverlap: true, stillShowZeroSum: false,
        data: data.filter(point => point.value !== null && point.value > 0), label: { overflow: 'truncate', width: 160 }, emphasis: { focus: 'self' } }] };
    return { ...base, grid: { left: 170, right: 50, top: 35, bottom: 50 },
      xAxis: { type: 'value', name: percent ? '%' : model.unit, min: value => Math.min(0, value.min) },
      yAxis: { type: 'category', inverse: true, data: nodes.map(node => node.label), axisLabel: { width: 150, overflow: 'truncate' } },
      series: [{ type: 'bar', data: data.map(point => ({ ...point, label: { show: false } })), barMaxWidth: 50 }] };
  }
  if (chart.kind === 'sankey') {
    const flow = compositionFlow(model); if (flow.kind !== 'flow') return base;
    const links = flow.links.flatMap(link => link.observation.state === 'observed' && link.observation.value > 0 ? [{ source: link.source, target: link.target, value: link.observation.value,
      description: `${flow.nodes.find(node => node.id === link.source)?.label} → ${flow.nodes.find(node => node.id === link.target)?.label}\n${compositionNumber(link.observation.value)} ${model.unit}${link.observation.partial ? '\nPartial coverage; known values only' : ''}` }] : []);
    const used = new Set(links.flatMap(link => [link.source, link.target]));
    return { ...base, series: [{ type: 'sankey', left: 20, right: 190, top: 25, bottom: 25, draggable: false, layoutIterations: 0,
      data: flow.nodes.filter(node => used.has(node.id)).map(node => ({ name: node.id, label: { formatter: node.label }, description: model.nodes.find(value => value.id === node.id)?.description ?? node.label, itemStyle: { color: model.nodes.find(value => value.id === node.id)?.color ?? visualizationSeriesStyle(node.id).color } })), links,
      label: { color: 'var(--v1-text)', width: 170, overflow: 'truncate' }, lineStyle: { color: 'source', opacity: .4 }, emphasis: { focus: 'adjacency' } }] };
  }
  const children = (parentId: string | undefined): object[] => model.nodes.filter(node => node.parentId === parentId && node.amount !== null && node.amount > 0).map(node => ({
    id: node.id, name: node.label, value: node.amount, description: node.description, itemStyle: { color: node.color, borderColor: 'var(--v1-surface)' },
    label: { formatter: `${node.label}\n${percent ? compositionPercent(node.percentage) : compositionNumber(node.amount!) + ' ' + model.unit}` }, children: children(node.id)
  }));
  const data = children(rootId || undefined);
  if (chart.kind === 'sunburst') return { ...base, series: [{ type: 'sunburst', radius: ['10%', '90%'], sort: null, nodeClick: false, data,
    label: { rotate: 'radial', overflow: 'truncate', minAngle: 8 }, itemStyle: { borderWidth: 2 }, emphasis: { focus: 'ancestor' } }] } as V1EChartsOption;
  return { ...base, series: [{ type: 'treemap', sort: false, roam: false, nodeClick: false, breadcrumb: { show: false }, leafDepth: 1, visibleMin: 0,
    data, label: { show: true, color: 'var(--v1-text)', overflow: 'truncate' }, upperLabel: { show: true, height: 28 }, itemStyle: { borderWidth: 2, gapWidth: 2 } }] } as V1EChartsOption;
}
