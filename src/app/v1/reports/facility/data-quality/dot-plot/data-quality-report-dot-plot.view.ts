import { V1EChartsOption } from '@app/v1/shared/charts/echarts';
import { MeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import {
  PredictorDataQualityReport, isPredictorDataQualityOutlier
} from '@domain/calculations/data-quality/predictor-data-quality';

export interface DotReading {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly outlier: boolean;
}
export interface DataQualityDotPlotInput {
  readonly readings: readonly DotReading[];
  readonly median: number;
  readonly lower: number;
  readonly upper: number;
  readonly metric: string;
  readonly unit: string;
  readonly rangeEnabled: boolean;
  readonly notice?: string;
}

export function meterDotPlotInput(report: MeterDataQualityReport, metric: 'consumption' | 'cost'): DataQualityDotPlotInput {
  const cost = metric === 'cost', stats = cost ? report.costStats : report.energyStats;
  return {
    readings: report.chartRows.flatMap(row => {
      const value = cost ? row.costValue : row.consumptionValue;
      return typeof value === 'number' && Number.isFinite(value) ? [{
        id: row.reading.guid, label: Number.isFinite(row.sortValue) ? row.dateLabel : 'Unknown date', value,
        outlier: cost ? row.costOutlier : row.consumptionOutlier
      }] : [];
    }),
    median: stats.median, lower: stats.medianminus2_5MAD, upper: stats.medianplus2_5MAD,
    metric: cost ? 'Total Cost' : 'Total Consumption', unit: cost ? '$' : report.unit, rangeEnabled: true
  };
}

export function predictorDotPlotInput(report: PredictorDataQualityReport): DataQualityDotPlotInput {
  const months = new Map(report.chartRows.map(row => [row.reading, row.dateLabel]));
  return {
    readings: report.readings.filter(reading => Number.isFinite(reading.amount)).map(reading => ({
      id: reading.guid, label: months.get(reading) ?? 'Unknown month', value: reading.amount,
      outlier: isPredictorDataQualityOutlier(reading.amount, report.statistics)
    })),
    median: report.statistics.median, lower: report.statistics.lowerExpectedBound,
    upper: report.statistics.upperExpectedBound, metric: 'Predictor Values', unit: report.unit,
    rangeEnabled: report.statistics.medianAbsDev > 0,
    notice: report.statistics.medianAbsDev === 0 ? 'Predictor outlier detection is not applied when MAD is zero.' : undefined
  };
}

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const scientific = new Intl.NumberFormat('en-US', { notation: 'scientific', maximumSignificantDigits: 7 });
function formattedValue(value: number, unit = ''): string {
  if (!Number.isFinite(value)) return 'Unavailable';
  const magnitude = Math.abs(value);
  const text = (magnitude >= 1e12 || magnitude > 0 && magnitude < 1e-6 ? scientific : number).format(value);
  return unit === '$' ? '$' + text : text + (unit ? ' ' + unit : '');
}

function dotPlotAxis(input: DataQualityDotPlotInput) {
  const readings = input.readings.filter(reading => Number.isFinite(reading.value));
  let minimum = Infinity, maximum = -Infinity;
  const rangeAvailable = input.rangeEnabled && Number.isFinite(input.lower) && Number.isFinite(input.upper);
  for (const reading of readings) { minimum = Math.min(minimum, reading.value); maximum = Math.max(maximum, reading.value); }
  if (rangeAvailable) { minimum = Math.min(minimum, input.lower); maximum = Math.max(maximum, input.upper); }
  const span = maximum - minimum;
  const padding = span > 0 ? span * .05 : minimum === 0 ? 1 : Math.abs(minimum) * .05 || Number.MIN_VALUE;
  return {
    readings, rangeAvailable,
    minimumAxis: Number.isFinite(minimum - padding) ? minimum - padding : minimum,
    maximumAxis: Number.isFinite(maximum + padding) ? maximum + padding : maximum,
    state: !readings.length ? 'empty' as const : !Number.isFinite(span) ? 'unrepresentable' as const : 'ready' as const
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/** Vertical positions only separate repeated values; numeric values and outlier flags remain unchanged. */
export function dataQualityDotPlotView(input: DataQualityDotPlotInput) {
  const axis = dotPlotAxis(input);
  const { rangeAvailable: range, minimumAxis, maximumAxis } = axis;
  const counts = new Map<number, number>();
  let levels = 1;
  const points = axis.readings.map(reading => {
    const level = (counts.get(reading.value) ?? 0) + 1;
    counts.set(reading.value, level);
    levels = Math.max(levels, level);
    return { ...reading, level };
  });
  const message = axis.state === 'empty' ? 'No usable numeric readings are available for this dot plot.'
    : axis.state === 'unrepresentable' ? 'These readings span a range that cannot be displayed. Review the values.' : undefined;
  const data = (outlier: boolean) => points.filter(point => point.outlier === outlier)
    .map(point => ({ value: [point.value, point.level], reading: point }));
  const option: V1EChartsOption | undefined = message ? undefined : {
    animation: false,
    grid: { left: 25, right: levels > 30 ? 45 : 20, top: 45, bottom: 75, containLabel: true },
    legend: { top: 0, textStyle: { color: 'var(--v1-text)' } },
    tooltip: { trigger: 'item', formatter: params => {
      const reading = (params as { data?: { reading?: DotReading } }).data?.reading;
      if (!reading) return '';
      const value = formattedValue(reading.value, input.unit);
      return `${escapeHtml(reading.label)}<br>${escapeHtml(input.metric)}: ${escapeHtml(value)}<br>`
        + (reading.outlier ? 'Outlier' : 'Not flagged as an outlier');
    } },
    xAxis: { type: 'value', min: minimumAxis, max: maximumAxis,
      name: input.unit ? `${input.metric} (${input.unit})` : input.metric, nameLocation: 'middle', nameGap: 30,
      nameTextStyle: { color: 'var(--v1-text)' },
      axisLabel: { color: 'var(--v1-muted)', hideOverlap: true, formatter: value => formattedValue(Number(value)) },
      splitLine: { lineStyle: { color: 'var(--v1-chart-grid)' } } },
    yAxis: { type: 'value', min: 0, max: levels + 1, show: false },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider', xAxisIndex: 0, bottom: 0, height: 18, filterMode: 'none' },
      ...(levels > 30 ? [{ type: 'slider' as const, orient: 'vertical' as const,
        yAxisIndex: 0, right: 0, top: 45, bottom: 75, width: 14, filterMode: 'none' as const }] : [])],
    series: [
      { name: 'Readings', type: 'scatter', data: data(false), symbolSize: 8,
        itemStyle: { color: 'var(--v1-chart-series-1)', borderColor: 'var(--v1-surface)', borderWidth: 1 },
        markArea: range && input.lower < input.upper ? { silent: true, label: { show: false },
          itemStyle: { color: 'var(--v1-success)', opacity: .12 },
          data: [[{ xAxis: input.lower }, { xAxis: input.upper }]] } : undefined },
      { name: 'Outliers', type: 'scatter', data: data(true), symbol: 'diamond', symbolSize: 11,
        itemStyle: { color: 'var(--v1-danger)', borderColor: 'var(--v1-surface)', borderWidth: 1 } },
      ...(Number.isFinite(input.median) ? [{ name: 'Median', type: 'line' as const,
        data: [[input.median, 0], [input.median, levels + 1]], symbol: 'none', silent: true,
        lineStyle: { type: 'dashed' as const, color: 'var(--v1-info)', width: 2 }, tooltip: { show: false } }] : [])
    ]
  };
  return {
    points: points.map(point => ({ ...point, valueLabel: formattedValue(point.value, input.unit) })),
    chartOption: option, message, rangeVisible: range && input.lower < input.upper,
    height: Math.max(260, Math.min(560, levels * 12 + 130)),
    summary: `Median: ${formattedValue(input.median)} · Expected range: ${range
      ? `${formattedValue(input.lower)} to ${formattedValue(input.upper)}` : 'Unavailable'} · `
      + `${points.length} readings · ${points.filter(point => point.outlier).length} outliers`
  };
}
