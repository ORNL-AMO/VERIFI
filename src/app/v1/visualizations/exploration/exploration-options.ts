import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { correlationStatistics } from '@domain/calculations/exploratory-statistics';
import { absentObservation, explorationObservationText, pairRows, type ExplorationModel, type ExplorationPair, type ExplorationSeries } from '@domain/visualizations/visualization-exploration';

export function pairOption(model: ExplorationModel, pair: ExplorationPair, zoom: V1EChartsDataZoomRange): V1EChartsOption {
  const observations = pairRows(model, pair);
  const rows = observations.filter(row => row.included && row.displayX !== null && row.displayY !== null);
  const chart = model.chart;
  const grouping = chart.kind === 'heatmap' ? 'none' : chart.grouping ?? 'none';
  const standardized = chart.kind !== 'heatmap' && chart.scale === 'z-score';
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const name = grouping === 'year' ? row.slot.start.slice(0, 4) : grouping === 'month' ? new Date(`${row.slot.start}T12:00:00Z`).toLocaleString('en-US', { month: 'short' }) : 'Observations';
    const group = groups.get(name) ?? []; group.push(row); groups.set(name, group);
  }
  const fit = correlationStatistics(rows.map(row => ({ x: row.displayX!, y: row.displayY! })));
  const min = rows.reduce((min, row) => Math.min(min, row.displayX!), Infinity), max = rows.reduce((max, row) => Math.max(max, row.displayX!), -Infinity);
  const showFit = chart.kind !== 'heatmap' && (chart.showFit ?? true);
  return {
    animation: false, aria: { enabled: true, label: { description: `${pair.y.label} versus ${pair.x.label}. Original observations: ${observations.map(row => `${row.slot.label}. ${pair.x.label}: ${explorationObservationText(row.x, pair.x.unit)}. ${pair.y.label}: ${explorationObservationText(row.y, pair.y.unit)}`).join('; ')}` } },
    legend: { show: model.legend && grouping !== 'none', type: 'scroll', top: 0, selectedMode: false },
    grid: { left: 24, right: 24, top: 48, bottom: 88, containLabel: true },
    xAxis: { type: 'value', scale: true, name: `${pair.x.label}${standardized ? ' (z-score)' : pair.x.unit ? ' (' + pair.x.unit + ')' : ''}`, nameLocation: 'middle', nameGap: 32, nameTruncate: { maxWidth: 240 } },
    yAxis: { type: 'value', scale: true, name: standardized ? 'z-score' : pair.y.unit, nameLocation: 'middle', nameRotate: 90, nameGap: 36, nameTruncate: { maxWidth: 200 } },
    tooltip: { trigger: 'item', renderMode: 'richText', confine: true, formatter: (value: unknown) => {
      const key = (value as { data?: { slotKey?: string } }).data?.slotKey;
      const row = rows.find(row => row.slot.key === key);
      return row ? `${row.slot.label}\n${pair.x.label}: ${explorationObservationText(row.x, pair.x.unit)}\n${pair.y.label}: ${explorationObservationText(row.y, pair.y.unit)}` : 'Linear fit';
    } },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, start: zoom.start, end: zoom.end, filterMode: 'none' }, { type: 'slider', xAxisIndex: 0, start: zoom.start, end: zoom.end, bottom: 4, height: 20, filterMode: 'none' }],
    series: [...[...groups].map(([name, values], index) => ({ id: `points-${name}`, type: 'scatter', name, symbolSize: 8,
      itemStyle: { color: `var(--v1-chart-series-${grouping === 'month' ? Number(values[0].slot.start.slice(5, 7)) : grouping === 'year' ? Number(values[0].slot.start.slice(0, 4)) % 12 + 1 : 1})` }, data: values.map(row => ({ value: [row.displayX, row.displayY], slotKey: row.slot.key })) })),
      ...(showFit && pair.statistics.slope !== undefined && fit.slope !== undefined && fit.intercept !== undefined ? [{ id: 'fit', name: 'Linear fit', type: 'line', silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: 'var(--v1-text)' },
        data: [[min, fit.slope * min + fit.intercept], [max, fit.slope * max + fit.intercept]] }] : [])]
  } as V1EChartsOption;
}

export interface HeatmapCell { readonly column: number; readonly row: number; readonly value: number | null; readonly text: string; readonly marker: string; readonly seriesId?: string; readonly slotKey?: string; readonly pairId?: string; }
export interface HeatmapPanel { readonly id: string; readonly title: string; readonly columns: readonly string[]; readonly rows: readonly string[]; readonly cells: readonly HeatmapCell[]; readonly unit: string; readonly legend: boolean; readonly diverging: boolean; readonly bounds?: readonly [number, number]; }
export function heatmapPanels(model: ExplorationModel): HeatmapPanel[] {
  const chart = model.chart;
  if (chart.kind === 'correlation') {
    const pairs = new Map(model.pairs.flatMap(pair => [[JSON.stringify([pair.x.id, pair.y.id]), pair], [JSON.stringify([pair.y.id, pair.x.id]), pair]] as const));
    const cells: HeatmapCell[] = [];
    model.series.forEach((y, row) => model.series.forEach((x, column) => {
      const pair = pairs.get(JSON.stringify([x.id, y.id]));
      const diagonal = x.id === y.id ? correlationStatistics([...x.observations.values()].flatMap(value => value.state === 'observed' && !value.partial && Number.isFinite(value.value) ? [{ x: value.value, y: value.value }] : [])) : undefined;
      const stats = pair?.statistics ?? diagonal;
      const value = chart.statistic === 'r' ? stats?.r : stats?.rSquared;
      cells.push({ row, column, value: value ?? null, marker: value === undefined ? '—' : '', pairId: pair?.id,
        text: `${x.label} / ${y.label}\n${chart.statistic === 'r' ? 'r' : 'R²'}: ${value ?? 'Unavailable'}${stats?.unavailableReason ? '\n' + stats.unavailableReason : ''}` });
    }));
    return [{ id: 'matrix', title: `Correlation matrix · ${chart.statistic === 'r' ? 'signed r' : 'R²'}`, columns: model.series.map(series => series.label), rows: model.series.map(series => series.label), cells, unit: chart.statistic === 'r' ? 'r' : 'R²', legend: model.legend, diverging: chart.statistic === 'r', bounds: chart.statistic === 'r' ? [-1, 1] : [0, 1] }];
  }
  if (chart.kind !== 'heatmap') return [];
  const standardized = chart.normalization === 'z-score';
  const cell = (series: ExplorationSeries, slot: ExplorationModel['slots'][number], row: number, column: number): HeatmapCell => {
    const observation = series.observations.get(slot.key) ?? absentObservation;
    const raw = observation.state === 'observed' && Number.isFinite(observation.value) ? observation.value : null;
    const value = standardized ? series.standardized.get(slot.key) ?? null : raw;
    return { row, column, value, seriesId: series.id, slotKey: slot.key,
      marker: observation.state === 'observed' ? observation.partial ? '*' : value === null ? '—' : '' : observation.state === 'excluded' ? '×' : '',
      text: `${series.label} · ${slot.label}\n${explorationObservationText(observation, series.unit)}${standardized ? `\nz-score: ${value ?? 'Unavailable (incomplete, constant or insufficient series)'}` : ''}` };
  };
  if (chart.dimension === 'series-period') return [{ id: 'series-period', title: model.title, columns: model.slots.map(slot => slot.label), rows: model.series.map(series => series.label),
    cells: model.series.flatMap((series, row) => model.slots.map((slot, column) => cell(series, slot, row, column))), unit: standardized ? 'z-score' : model.series[0]?.unit ?? '', legend: model.legend, diverging: chart.scale === 'diverging' }];
  const slots = new Map(model.slots.map(slot => [slot.key, slot]));
  const years = [...new Set(model.slots.map(slot => slot.start.slice(0, 4)))];
  const months = Array.from({ length: 12 }, (_, index) => new Date(2020, index, 1).toLocaleString('en-US', { month: 'short' }));
  return model.series.map(series => ({ id: series.id, title: series.label, columns: months, rows: years,
    cells: years.flatMap((year, row) => months.map((_, column) => {
      const key = `${year}-${String(column + 1).padStart(2, '0')}`, slot = slots.get(key);
      return slot ? cell(series, slot, row, column) : { row, column, value: null, marker: '', text: `${key}: Outside the selected observation range.` };
    })), unit: standardized ? 'z-score' : series.unit, legend: model.legend, diverging: chart.scale === 'diverging' }));
}
export function heatmapOption(panel: HeatmapPanel): V1EChartsOption {
  const values = panel.cells.flatMap(cell => cell.value === null ? [] : [cell.value]);
  let min = values.length ? values.reduce((a, b) => Math.min(a, b), Infinity) : 0;
  let max = values.length ? values.reduce((a, b) => Math.max(a, b), -Infinity) : 1;
  if (panel.diverging) { max = Math.max(Math.abs(min), Math.abs(max), 1e-12); min = -max; }
  if (min === max) max = min + 1;
  if (panel.bounds) [min, max] = panel.bounds;
  const scaleLabel = (value: number) => `${Number(value.toPrecision(4))}${panel.unit ? ' ' + panel.unit : ''}`;
  const data = (cell: HeatmapCell) => ({ value: [cell.column, cell.row, cell.value!], cell,
    itemStyle: { borderWidth: 1, borderColor: 'var(--v1-border)' },
    label: { show: !!cell.marker, formatter: cell.marker, color: 'var(--v1-text)', textBorderColor: 'var(--v1-surface)', textBorderWidth: 2 } });
  const gaps = panel.cells.filter(cell => cell.value === null);
  // Keep gaps hoverable without assigning them a numerical value or including them in the color scale.
  const renderGap = (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
    const point = api.coord([api.value(0), api.value(1)]), size = api.size!([1, 1]) as number[];
    const width = Math.abs(size[0]), height = Math.abs(size[1]), marker = gaps[params.dataIndex].marker;
    return { type: 'rect', shape: { x: point[0] - width / 2, y: point[1] - height / 2, width, height },
      style: { fill: api.visual('color') as string },
      ...(marker ? { textContent: { type: 'text', style: { text: marker, fill: api.visual('borderColor') as string, fontSize: 12 } },
        textConfig: { position: 'inside' } } : {}) };
  };
  return { animation: false, aria: { enabled: true, label: { description: `${panel.title}. Blank cells have no data. ${panel.cells.map(cell => cell.text).join('; ')}` } },
    grid: { top: 20, left: 24, right: 24, bottom: 92, containLabel: true },
    xAxis: { type: 'category', data: [...panel.columns], axisLabel: { hideOverlap: true, width: 100, overflow: 'truncate' } },
    yAxis: { type: 'category', data: [...panel.rows], axisLabel: { width: 150, overflow: 'truncate' } },
    visualMap: [{ type: 'continuous', show: panel.legend && (values.length > 0 || !!panel.bounds), seriesIndex: 1, min, max, text: [scaleLabel(max), scaleLabel(min)], orient: 'horizontal', left: 'center', bottom: 6, calculable: false,
      textStyle: { color: 'var(--v1-text)' }, formatter: (value: number) => `${Number(value.toPrecision(4))}${panel.unit ? ' ' + panel.unit : ''}`,
      inRange: { color: panel.diverging ? ['#2166ac', '#f7f7f7', '#b2182b'] : ['#eff3ff', '#6baed6', '#08519c'] } }],
    tooltip: { renderMode: 'richText', confine: true, formatter: (value: unknown) => (value as { data?: { cell?: HeatmapCell } }).data?.cell?.text ?? '' },
    series: [{ type: 'custom', id: 'missing', coordinateSystem: 'cartesian2d', dimensions: ['column', 'row'], encode: { x: 0, y: 1 },
      data: gaps.map(cell => ({ value: [cell.column, cell.row], cell })), renderItem: renderGap,
      itemStyle: { color: 'var(--v1-surface)', borderColor: 'var(--v1-text)' } },
      { type: 'heatmap', id: 'values', data: panel.cells.filter(cell => cell.value !== null).map(data) }]
  } as V1EChartsOption;
}
