import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import type { V1EChartsOption } from '../echarts';
import { MeterResultsChartComparisonBand, MeterResultsChartMetric, MeterResultsChartRow } from '../metric-results-chart.models';

export type MeterChartSeriesDisplay = 'off' | 'bar' | 'line';
type MeterChartComparisonDirection = 'comparison-above' | 'reference-above';

/** Plain inputs shared by the interactive chart and detached report exports. */
export interface MetricResultsChartOptions {
  readonly rows: readonly MeterResultsChartRow[];
  readonly metrics: readonly MeterResultsChartMetric[];
  readonly leftMetricId?: string;
  readonly rightMetricId?: string;
  readonly leftDisplay?: MeterChartSeriesDisplay;
  readonly rightDisplay?: MeterChartSeriesDisplay;
  readonly allMetrics?: boolean;
  readonly allMetricsDisplay?: Exclude<MeterChartSeriesDisplay, 'off'>;
  readonly stackSeries?: boolean;
  readonly comparisonBand?: MeterResultsChartComparisonBand;
  readonly highlightedMetricId?: string;
  readonly sharedYAxis?: boolean;
  readonly yAxisTitle?: string;
  readonly allowNegativeValues?: boolean;
  readonly compactAxes?: boolean;
  readonly smoothLines?: boolean;
  readonly showPointSymbols?: boolean;
  readonly showValueLabels?: boolean;
  readonly compactValueLabels?: boolean;
  readonly showLegend?: boolean;
  readonly tooltipMaxRows?: number;
  readonly tooltipOverflowHint?: string;
  readonly zoomStart?: number;
  readonly zoomEnd?: number;
}

export function metricResultsChartOption(options: MetricResultsChartOptions): V1EChartsOption {
  const allMetrics = options.allMetrics ?? false;
  const leftDisplay = options.leftDisplay ?? 'line';
  const rightDisplay = options.rightDisplay ?? 'line';
  const allMetricsDisplay = options.allMetricsDisplay ?? 'line';
  const utilityMetric = metricById(options.metrics, options.leftMetricId);
  const right = metricById(options.metrics, options.rightMetricId);
  const costMetric = right?.currency && metricLifetimeTotal(options.rows, right.id) === 0 ? undefined : right;
  const visibleMetrics = allMetrics ? options.metrics : [
    ...(utilityMetric && leftDisplay !== 'off' ? [utilityMetric] : []),
    ...(costMetric && rightDisplay !== 'off' ? [costMetric] : [])
  ];
  const canZoom = options.rows.length > 2;
  const rows = options.rows;
  const yAxis: Array<Record<string, unknown>> = [];
  const series: Array<Record<string, unknown>> = [];

  if (allMetrics) {
    const metrics = visibleMetrics;
    const highlighted = metrics.some(metric => metric.id === options.highlightedMetricId) ? options.highlightedMetricId : undefined;
    if (metrics.length) {
      yAxis.push(metricAxis(metrics[0], options.yAxisTitle, (options.allowNegativeValues ?? false), (options.compactAxes ?? false)));
    }
    const comparisonBand = options.comparisonBand;
    if (comparisonBand && allMetricsDisplay === 'line') {
      series.push(
        comparisonBandSeries(rows, comparisonBand, 'comparison-above'),
        comparisonBandSeries(rows, comparisonBand, 'reference-above')
      );
    }
    metrics.forEach((metric, index) => {
      const display = allMetricsDisplay;
      series.push({
        id: metric.id,
        name: metric.label,
        type: display,
        yAxisIndex: 0,
        ...metricSeriesData(rows, metric.id),
        connectNulls: false,
        smooth: (options.smoothLines !== false) && display === 'line' && rows.length > 2 && !comparisonBand,
        showSymbol: display === 'line' && (options.showPointSymbols !== false),
        symbolSize: display === 'line' ? 7 : undefined,
        stack: display === 'bar' && (options.stackSeries ?? false) ? 'results' : undefined,
        itemStyle: { color: metric.color ?? chartSeriesColor(index), opacity: highlighted && metric.id !== highlighted ? .2 : 1 },
        lineStyle: { color: metric.color ?? chartSeriesColor(index), type: metric.lineStyle ?? 'solid', width: metric.id === highlighted ? 4 : 3, opacity: highlighted && metric.id !== highlighted ? .2 : 1 },
        z: 2,
        ...seriesValueLabel((options.showValueLabels ?? false), metric, (options.compactValueLabels ?? false))
      });
    });
  } else if (utilityMetric && leftDisplay !== 'off') {
    yAxis.push(metricAxis(utilityMetric, options.yAxisTitle, (options.allowNegativeValues ?? false), (options.compactAxes ?? false)));
    series.push({
      name: utilityMetric.label,
      type: leftDisplay,
      yAxisIndex: 0,
      data: rows.map(row => chartValue(row, utilityMetric.id)),
      connectNulls: false,
      smooth: leftDisplay === 'line' && rows.length > 2,
      itemStyle: { color: 'var(--v1-chart-series-1)' },
      lineStyle: { color: 'var(--v1-chart-series-1)', width: 3 },
      ...seriesValueLabel((options.showValueLabels ?? false), utilityMetric, (options.compactValueLabels ?? false))
    });
  }

  if (!allMetrics && costMetric && rightDisplay !== 'off') {
    if (!(options.sharedYAxis ?? false) || yAxis.length === 0) {
      yAxis.push(metricAxis(costMetric, options.yAxisTitle, (options.allowNegativeValues ?? false), (options.compactAxes ?? false)));
    }
    series.push({
      name: costMetric.label,
      type: rightDisplay,
      yAxisIndex: (options.sharedYAxis ?? false) ? 0 : yAxis.length - 1,
      data: rows.map(row => chartValue(row, costMetric.id)),
      connectNulls: false,
      smooth: rightDisplay === 'line' && rows.length > 2,
      itemStyle: { color: 'var(--v1-chart-series-3)' },
      lineStyle: { color: 'var(--v1-chart-series-3)', width: 3 },
      ...seriesValueLabel((options.showValueLabels ?? false), costMetric, (options.compactValueLabels ?? false))
    });
  }

  const alignedYAxis = alignDualYAxis(yAxis);
  const emphasizeZeroPercent = (options.sharedYAxis ?? false) && (options.allowNegativeValues ?? false)
    && visibleMetrics.length > 0 && visibleMetrics.every(metric => metric.unit === '%');

  return {
    tooltip: { trigger: 'axis', ...(options.tooltipMaxRows ? { confine: true } : {}), formatter: params => formatChartTooltip(params, options.metrics, options.tooltipMaxRows, (options.tooltipOverflowHint ?? 'Use the legend to show fewer series.')) },
    legend: { show: (options.showLegend !== false), top: 0, left: 'center', right: 88, data: visibleMetrics.map(metric => metric.label) },
    grid: {
      top: !(options.showLegend !== false) ? ((options.compactAxes ?? false) ? 12 : 24) : (options.showValueLabels ?? false) ? 84 : 72,
      right: (options.compactAxes ?? false) ? 8 : alignedYAxis.length > 1 ? 56 : 18,
      bottom: canZoom ? 74 : 36,
      left: (options.compactAxes ?? false) ? 8 : 54,
      ...((options.compactAxes ?? false) ? { outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' } : { containLabel: true })
    },
    xAxis: {
      type: 'category',
      data: rows.map(row => row.periodLabel),
      axisLine: emphasizeZeroPercent ? {
        show: true,
        onZero: true,
        onZeroAxisIndex: 0,
        lineStyle: { width: 2, color: 'var(--v1-chart-annotation)' }
      } : undefined
    },
    yAxis: alignedYAxis.length > 0 ? alignedYAxis : [{ type: 'value', min: 0 }],
    dataZoom: canZoom
      ? [
        { type: 'inside', start: (options.zoomStart ?? 0), end: (options.zoomEnd ?? 100) },
        { type: 'slider', start: (options.zoomStart ?? 0), end: (options.zoomEnd ?? 100), bottom: 14, height: 24,
          ...((options.compactAxes ?? false) ? { left: 8, right: 8 } : {}) }
      ]
      : [],
    series
  } as V1EChartsOption;
}

function chartSeriesColor(index: number): string {
  return `var(--v1-chart-series-${(index % 4) + 1})`;
}

function comparisonBandSeries(
  rows: readonly MeterResultsChartRow[],
  band: MeterResultsChartComparisonBand,
  direction: MeterChartComparisonDirection
): Record<string, unknown> {
  return {
    type: 'custom',
    coordinateSystem: 'cartesian2d',
    data: rows.slice(0, -1).flatMap((row, index) => {
      const nextRow = rows[index + 1];
      const values = [
        index,
        chartValue(row, band.referenceMetricId),
        chartValue(row, band.comparisonMetricId),
        index + 1,
        chartValue(nextRow, band.referenceMetricId),
        chartValue(nextRow, band.comparisonMetricId)
      ];
      return values.slice(1).some(value => value === null) ? [] : [values];
    }),
    encode: { x: [0, 3], y: [1, 2, 4, 5] },
    itemStyle: {
      color: direction === 'comparison-above' ? band.comparisonAboveColor : band.referenceAboveColor,
      opacity: 0.18
    },
    renderItem: (
      _params: CustomSeriesRenderItemParams,
      api: CustomSeriesRenderItemAPI
    ): CustomSeriesRenderItemReturn => renderComparisonBandSegment(api, direction),
    silent: true,
    tooltip: { show: false },
    z: 1
  };
}

function renderComparisonBandSegment(
  api: CustomSeriesRenderItemAPI,
  direction: MeterChartComparisonDirection
): CustomSeriesRenderItemReturn {
  const startIndex = Number(api.value(0));
  const referenceStart = Number(api.value(1));
  const comparisonStart = Number(api.value(2));
  const endIndex = Number(api.value(3));
  const referenceEnd = Number(api.value(4));
  const comparisonEnd = Number(api.value(5));
  const startDifference = comparisonStart - referenceStart;
  const endDifference = comparisonEnd - referenceEnd;
  const rendersPositive = direction === 'comparison-above';
  const startMatchesDirection = rendersPositive ? startDifference >= 0 : startDifference <= 0;
  const endMatchesDirection = rendersPositive ? endDifference >= 0 : endDifference <= 0;

  if (!startMatchesDirection && !endMatchesDirection) {
    return undefined;
  }

  const referenceStartPoint = api.coord([startIndex, referenceStart]);
  const comparisonStartPoint = api.coord([startIndex, comparisonStart]);
  const referenceEndPoint = api.coord([endIndex, referenceEnd]);
  const comparisonEndPoint = api.coord([endIndex, comparisonEnd]);
  let points: number[][];

  if (startMatchesDirection && endMatchesDirection) {
    points = [referenceStartPoint, referenceEndPoint, comparisonEndPoint, comparisonStartPoint];
  } else {
    const crossingRatio = Math.abs(startDifference) / (Math.abs(startDifference) + Math.abs(endDifference));
    const crossingPoint = [
      referenceStartPoint[0] + ((referenceEndPoint[0] - referenceStartPoint[0]) * crossingRatio),
      referenceStartPoint[1] + ((referenceEndPoint[1] - referenceStartPoint[1]) * crossingRatio)
    ];
    points = startMatchesDirection
      ? [referenceStartPoint, crossingPoint, crossingPoint, comparisonStartPoint]
      : [crossingPoint, referenceEndPoint, comparisonEndPoint, crossingPoint];
  }

  return {
    type: 'polygon',
    shape: { points },
    style: api.style({ stroke: 'none' }),
    silent: true
  };
}

function seriesValueLabel(
  show: boolean,
  metric: MeterResultsChartMetric,
  compact: boolean
): Record<string, unknown> {
  if (!show) return {};
  return {
    label: {
      show: true,
      position: 'top',
      distance: 6,
      color: 'var(--v1-text)',
      fontSize: 11,
      formatter: (params: { value?: unknown }) => formatChartValueLabel(params.value, metric, compact)
    },
    labelLayout: { hideOverlap: true }
  };
}

function formatChartValueLabel(
  value: unknown,
  metric: MeterResultsChartMetric,
  compact: boolean
): string {
  if (Array.isArray(value)) value = value[1];
  if (value === null || value === undefined) return '';
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return '';
  if (metric.unit === '%') {
    return `${numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  }
  if (compact) return formatCompactChartValue(numericValue);
  return Math.round(numericValue).toLocaleString('en-US');
}

function formatCompactChartValue(value: number): string {
  const absoluteValue = Math.abs(value);
  if (absoluteValue < 1000) return Math.round(value).toLocaleString('en-US');
  const divisor = absoluteValue >= 1_000_000_000
    ? 1_000_000_000
    : absoluteValue >= 1_000_000
      ? 1_000_000
      : 1_000;
  const suffix = divisor === 1_000_000_000 ? 'b' : divisor === 1_000_000 ? 'm' : 'k';
  return `${Number((value / divisor).toFixed(1))}${suffix}`;
}

export function metricById(
  metrics: readonly MeterResultsChartMetric[],
  metricId: string | undefined
): MeterResultsChartMetric | undefined {
  return metricId ? metrics.find(metric => metric.id === metricId) : undefined;
}

export function coerceMetricId(
  metrics: readonly MeterResultsChartMetric[],
  metricId: string | undefined
): string | undefined {
  return metricId && metrics.some(metric => metric.id === metricId) ? metricId : undefined;
}

function metricAxis(
  metric: MeterResultsChartMetric,
  title: string | undefined,
  allowNegativeValues: boolean,
  compactLabels = false
): Record<string, unknown> {
  const axis: Record<string, unknown> = {
    type: 'value',
    name: title ?? (metric.unit ? `${metric.label} (${metric.unit})` : metric.label)
  };
  if (!allowNegativeValues) {
    axis['min'] = 0;
  }
  if (compactLabels) {
    axis['axisLabel'] = { formatter: (value: number) => formatCompactAxisValue(value, metric) };
  } else if (metric.currency) {
    axis['axisLabel'] = { formatter: '${value}' };
  } else if (metric.unit === '%') {
    axis['axisLabel'] = { formatter: '{value}%' };
  }
  return axis;
}

const compactAxisNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const smallAxisNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

function formatCompactAxisValue(value: number, metric: MeterResultsChartMetric): string {
  const absolute = Math.abs(value);
  const label = (absolute >= 1000 ? compactAxisNumber : smallAxisNumber).format(absolute).replace('K', 'k');
  return `${value < 0 ? '-' : ''}${metric.currency ? '$' : ''}${label}${!metric.currency && metric.unit === '%' ? '%' : ''}`;
}

export function accessibleMetricLabel(metric: MeterResultsChartMetric): string {
  if (metric.currency) {
    return `${metric.label} (USD)`;
  }
  return metric.unit ? `${metric.label} (${metric.unit})` : metric.label;
}

export function chartValue(row: MeterResultsChartRow, metricId: string): number | null {
  const value = row.values[metricId];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metricSeriesData(rows: readonly MeterResultsChartRow[], metricId: string): Record<string, unknown> {
  if (!rows.some(row => row.paddingMetricIds?.includes(metricId))) {
    return { data: rows.map(row => chartValue(row, metricId)) };
  }
  // Explicit category indices let independent histories omit padding without connecting real null gaps.
  const data: [number, number | null][] = [];
  rows.forEach((row, index) => {
    if (!row.paddingMetricIds?.includes(metricId)) data.push([index, chartValue(row, metricId)]);
  });
  return { data, encode: { x: 0, y: 1 } };
}

export function metricLifetimeTotal(rows: readonly MeterResultsChartRow[], metricId: string): number {
  return rows.reduce((total, row) => total + (chartValue(row, metricId) ?? 0), 0);
}

function alignDualYAxis(yAxis: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (yAxis.length < 2) {
    return yAxis;
  }
  return yAxis.map((axis, index) => ({
    ...axis,
    alignTicks: true,
    splitNumber: 4,
    splitLine: { show: index === 0 }
  }));
}

function formatChartTooltip(
  params: unknown,
  metrics: readonly MeterResultsChartMetric[],
  maxRows: number | undefined,
  overflowHint: string
): string {
  const tooltipParams = (Array.isArray(params) ? params : [params])
    .filter(isTooltipParam)
    .filter(param => metrics.some(metric => metric.label === param.seriesName));
  const firstParam = tooltipParams[0];
  const header = firstParam ? `<div>${escapeHtml(firstParam.axisValueLabel ?? firstParam.name ?? '')}</div>` : '';
  const limit = maxRows && maxRows > 0 ? maxRows : tooltipParams.length;
  const omitted = Math.max(0, tooltipParams.length - limit);
  const rows = tooltipParams.slice(0, limit)
    .map(param => {
      const metric = metrics.find(item => item.id === param.seriesId) ?? metrics.find(item => item.label === param.seriesName);
      const value = formatChartTooltipValue(param.value, metric?.currency, metric?.unit);
      return `<div>${param.marker ?? ''}${escapeHtml(param.seriesName ?? '')}: ${escapeHtml(value)}</div>`;
    })
    .join('');
  const more = omitted ? `<div>+${omitted} more meters. ${escapeHtml(overflowHint)}</div>` : '';
  return `${header}${rows}${more}`;
}

function formatChartTooltipValue(value: unknown, currency = false, unit?: string): string {
  if (Array.isArray(value)) value = value[1];
  if (value === null || value === undefined) return '—';
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value ?? '');
  }
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  }
  if (unit === '%') {
    return `${numericValue.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`;
  }
  return Math.round(numericValue).toLocaleString();
}

export function formatChartAccessibleValue(value: unknown, currency = false, unit?: string): string {
  return value === null || value === undefined
    ? 'Unavailable'
    : formatChartTooltipValue(value, currency, unit);
}

export function clampPercent(value: number, fallback: number): number {
  return Number.isFinite(value) ? clamp(value, 0, 100) : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface ChartTooltipParam {
  seriesId?: string;
  axisValueLabel?: string;
  marker?: string;
  name?: string;
  seriesName?: string;
  value?: unknown;
}

function isTooltipParam(value: unknown): value is ChartTooltipParam {
  return typeof value === 'object' && value !== null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}
