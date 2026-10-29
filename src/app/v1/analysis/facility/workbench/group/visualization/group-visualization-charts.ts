import type { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import type { CorrelationSummary, GroupMonthlyPoint, GroupVisualizationPreferences, TimeSeriesDisplay, VisualizationPredictor } from './group-visualization.models';

export const GROUP_USAGE_COLOR = 'var(--v1-text)';

/** Display rounding only; plotted values and statistics retain full precision. */
export function formatRawVisualizationValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumSignificantDigits: 5 }) : 'unavailable';
}

export function timeSeriesOption(points: readonly GroupMonthlyPoint[], predictors: readonly VisualizationPredictor[],
  usageLabel: string, zoom: GroupVisualizationPreferences['zoom'], display: TimeSeriesDisplay): V1EChartsOption {
  const units = [...new Set(predictors.map(predictor => predictor.unit || 'unit unspecified'))];
  const standardized = display.scale === 'z-score';
  return {
    animation: false,
    legend: { show: false },
    grid: { left: 85, right: standardized ? 30 : 95, top: 20, bottom: 85 },
    tooltip: { trigger: 'axis', renderMode: 'richText', confine: true,
      // ECharts merges tooltip options, so always replace the previous scale's formatter.
      formatter: standardized ? zScoreTooltip : rawValueTooltip },
    xAxis: { type: 'category', data: points.map(point => point.label), boundaryGap: false,
      axisLine: standardized ? { show: true, onZero: true, onZeroAxisIndex: 0,
        lineStyle: { width: 2, color: 'var(--v1-chart-annotation)' } } : undefined },
    yAxis: standardized ? [
      { type: 'value', name: 'Standard deviations from mean', nameLocation: 'middle', nameGap: 65 }
    ] : [
      { type: 'value', name: usageLabel, nameLocation: 'middle', nameGap: 65, scale: true,
        axisLabel: { formatter: formatRawVisualizationValue } },
      { type: 'value', name: units.length === 1 ? `Predictors (${units[0]})` : 'Predictors',
        nameLocation: 'middle', nameGap: 70, position: 'right', scale: true, splitLine: { show: false }, show: predictors.length > 0,
        axisLabel: { formatter: formatRawVisualizationValue } }
    ],
    dataZoom: [{ type: 'inside', ...zoom }, { type: 'slider', ...zoom, bottom: 12 }],
    series: [
      { id: 'group-usage', name: standardized ? 'Group usage' : usageLabel, type: 'line', yAxisIndex: 0, connectNulls: false,
        showSymbol: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3 },
        itemStyle: { color: GROUP_USAGE_COLOR }, data: [...display.groupValues] },
      ...predictors.map(predictor => ({
        id: predictor.guid, name: standardized ? predictor.name : predictor.label, type: 'line' as const, yAxisIndex: standardized ? 0 : 1,
        connectNulls: false, showSymbol: false,
        lineStyle: { type: typeof predictor.style.lineStyle === 'string' ? predictor.style.lineStyle : [...predictor.style.lineStyle], width: 2 }, itemStyle: { color: predictor.style.color },
        data: [...display.predictorValues[predictor.guid]]
      }))
    ]
  };
}

function axisTooltip(params: unknown, format: (value: unknown) => string): string {
  const entries = (Array.isArray(params) ? params : [params]) as {
    axisValueLabel?: string; name?: string; seriesName?: string; value?: number | null
  }[];
  return [entries[0]?.axisValueLabel ?? entries[0]?.name ?? '',
    ...entries.map(entry => `${entry.seriesName}: ${format(entry.value)}`)].join('\n');
}

export function rawValueTooltip(params: unknown): string {
  return axisTooltip(params, formatRawVisualizationValue);
}

export function zScoreTooltip(params: unknown): string {
  return axisTooltip(params, value => `z = ${formatZScoreVisualizationValue(value)}`);
}

export function formatZScoreVisualizationValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 5 }) : 'unavailable';
}

export function correlationOption(predictor: VisualizationPredictor, summary: CorrelationSummary, usageLabel: string): V1EChartsOption {
  const extent = summary.pairs.reduce((range, pair) => ({ min: Math.min(range.min, pair.x), max: Math.max(range.max, pair.x) }),
    { min: Infinity, max: -Infinity });
  const min = summary.pairs.length ? extent.min : 0, max = summary.pairs.length ? extent.max : 0;
  return {
    animation: false,
    legend: { show: false },
    grid: { left: 85, right: 30, top: 12, bottom: 65 },
    tooltip: { trigger: 'item', renderMode: 'richText', confine: true,
      formatter: (params: unknown) => {
        const value = (params as { value: [number, number, string] }).value;
        return `${value[2]}\n${predictor.label}: ${formatRawVisualizationValue(value[0])}\n${usageLabel}: ${formatRawVisualizationValue(value[1])}`;
      } },
    xAxis: { type: 'value', name: predictor.label, nameLocation: 'middle', nameGap: 38,
      nameTruncate: { maxWidth: 210, ellipsis: '…' }, scale: true, axisLabel: { formatter: formatRawVisualizationValue } },
    yAxis: { type: 'value', name: usageLabel, nameLocation: 'middle', nameGap: 65, scale: true,
      axisLabel: { formatter: formatRawVisualizationValue } },
    series: [
      { name: predictor.label, type: 'scatter', symbolSize: 9, itemStyle: { color: predictor.style.color },
        data: summary.pairs.map(pair => [pair.x, pair.y, pair.label]) },
      ...(summary.slope == null || summary.intercept == null ? [] : [{ name: 'Linear fit', type: 'line' as const,
        showSymbol: false, silent: true, tooltip: { show: false }, lineStyle: { type: 'dashed' as const, color: 'var(--v1-text)' },
        data: [[min, summary.intercept + summary.slope * min], [max, summary.intercept + summary.slope * max]] }])
    ]
  };
}
