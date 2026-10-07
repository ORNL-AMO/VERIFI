import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewChild, computed, signal } from '@angular/core';
import type {
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemReturn
} from 'echarts';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  MeterResultsChartComparisonBand,
  MeterResultsChartMetric,
  MeterResultsChartRow,
  MeterResultsPeriod
} from '@app/v1/facility/data/meters/models';

type MeterChartState = 'idle' | 'loading' | 'ready' | 'error';
type MeterChartSeriesDisplay = 'off' | 'bar' | 'line';
type MeterChartComparisonDirection = 'comparison-above' | 'reference-above';

let nextChartId = 0;

interface MeterChartAccessibleColumn {
  readonly id: string;
  readonly label: string;
}

interface MeterChartAccessibleCell {
  readonly metricId: string;
  readonly valueLabel: string;
}

interface MeterChartAccessibleRow {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly cells: readonly MeterChartAccessibleCell[];
}

@Component({
  selector: 'app-meter-results-chart',
  templateUrl: './meter-results-chart.component.html',
  styleUrls: ['./meter-results-chart.component.css'],
  standalone: true,
  imports: [CommonModule, EChartsChartDirective, IconComponent]
})
export class MeterResultsChartComponent implements OnChanges {
  @Input() chartRows: readonly MeterResultsChartRow[] = [];
  @Input() metrics: readonly MeterResultsChartMetric[] = [];
  @Input() defaultLeftMetricId?: string;
  @Input() defaultRightMetricId?: string;
  @Input() defaultLeftDisplay: MeterChartSeriesDisplay = 'line';
  @Input() defaultRightDisplay: MeterChartSeriesDisplay = 'line';
  @Input() sharedYAxis = false;
  @Input() yAxisTitle?: string;
  @Input() allowNegativeValues = false;
  @Input() showSeriesControls = true;
  @Input() showValueLabels = false;
  @Input() compactValueLabels = false;
  @Input() showAllMetrics = false;
  @Input() allMetricsDisplay: Exclude<MeterChartSeriesDisplay, 'off'> = 'line';
  @Input() stackSeries = false;
  @Input() comparisonBand?: MeterResultsChartComparisonBand;
  @Input() period: MeterResultsPeriod = 'monthly';
  @Input() state: MeterChartState = 'ready';
  @Input() ariaLabel = 'Meter results chart';
  @Input() loadingTitle = 'Preparing chart data';
  @Input() loadingDescription = 'VERIFI is calculating calendarized data.';
  @Input() errorTitle = 'Chart data could not be calculated';
  @Input() errorDescription = 'Check the meter data and try again.';
  @Input() emptyTitle = 'No results to chart';
  @Input() emptyDescription = 'Add meter data to see charted results.';
  @Input() downloadFileName = 'meter-results-chart';
  @Input() joinsFollowingSection = false;
  @Input() embedded = false;

  @ViewChild(EChartsChartDirective) chartDirective?: EChartsChartDirective;

  readonly idPrefix = `v1-meter-results-chart-${++nextChartId}`;
  readonly rows = signal<readonly MeterResultsChartRow[]>([]);
  readonly metricOptions = signal<readonly MeterResultsChartMetric[]>([]);
  readonly chartState = signal<MeterChartState>('ready');
  readonly chartPeriod = signal<MeterResultsPeriod>('monthly');
  readonly utilityMetricId = signal<string | undefined>(undefined);
  readonly costMetricId = signal<string | undefined>(undefined);
  readonly utilityDisplay = signal<MeterChartSeriesDisplay>('line');
  readonly costDisplay = signal<MeterChartSeriesDisplay>('line');
  readonly allMetricsEnabled = signal(false);
  readonly allMetricSeriesDisplay = signal<Exclude<MeterChartSeriesDisplay, 'off'>>('line');
  readonly allMetricSeriesStacked = signal(false);
  readonly metricComparisonBand = signal<MeterResultsChartComparisonBand | undefined>(undefined);
  readonly zoomStart = signal(0);
  readonly zoomEnd = signal(100);
  readonly utilityMetric = computed(() => metricById(this.metricOptions(), this.utilityMetricId()));
  readonly costMetric = computed(() => {
    const metric = metricById(this.metricOptions(), this.costMetricId());
    return metric?.currency && metricLifetimeTotal(this.rows(), metric.id) === 0
      ? undefined
      : metric;
  });
  readonly canZoom = computed(() => this.rows().length > 2);
  readonly visibleMetrics = computed<readonly MeterResultsChartMetric[]>(() => {
    if (this.allMetricsEnabled()) {
      return this.metricOptions();
    }
    const metrics: MeterResultsChartMetric[] = [];
    const utilityMetric = this.utilityMetric();
    const costMetric = this.costMetric();
    if (utilityMetric && this.utilityDisplay() !== 'off') {
      metrics.push(utilityMetric);
    }
    if (costMetric && this.costDisplay() !== 'off') {
      metrics.push(costMetric);
    }
    return metrics;
  });
  readonly accessibleColumns = computed<readonly MeterChartAccessibleColumn[]>(() => {
    return this.visibleMetrics().map(metric => ({
      id: metric.id,
      label: accessibleMetricLabel(metric)
    }));
  });
  readonly accessibleRows = computed<readonly MeterChartAccessibleRow[]>(() => {
    const metrics = this.visibleMetrics();
    return this.rows().map(row => ({
      periodKey: row.periodKey,
      periodLabel: row.periodLabel,
      cells: metrics.map(metric => ({
        metricId: metric.id,
        valueLabel: formatChartTooltipValue(chartValue(row, metric.id), !!metric.currency, metric.unit)
      }))
    }));
  });
  readonly accessiblePeriodHeader = computed(() => this.chartPeriod() === 'yearly' ? 'Fiscal year' : 'Month');
  readonly hasChartSeries = computed(() => {
    return this.rows().length > 0
      && this.visibleMetrics().length > 0;
  });
  readonly chartOption = computed<V1EChartsOption>(() => {
    const rows = this.rows();
    const utilityMetric = this.utilityMetric();
    const costMetric = this.costMetric();
    const yAxis: Array<Record<string, unknown>> = [];
    const series: Array<Record<string, unknown>> = [];

    if (this.allMetricsEnabled()) {
      const metrics = this.visibleMetrics();
      if (metrics.length) {
        yAxis.push(metricAxis(metrics[0], this.yAxisTitle, this.allowNegativeValues));
      }
      const comparisonBand = this.metricComparisonBand();
      if (comparisonBand && this.allMetricSeriesDisplay() === 'line') {
        series.push(
          comparisonBandSeries(rows, comparisonBand, 'comparison-above'),
          comparisonBandSeries(rows, comparisonBand, 'reference-above')
        );
      }
      metrics.forEach((metric, index) => {
        const display = this.allMetricSeriesDisplay();
        series.push({
          name: metric.label,
          type: display,
          yAxisIndex: 0,
          data: rows.map(row => chartValue(row, metric.id)),
          smooth: display === 'line' && rows.length > 2 && !comparisonBand,
          showSymbol: display === 'line',
          symbolSize: display === 'line' ? 7 : undefined,
          stack: display === 'bar' && this.allMetricSeriesStacked() ? 'results' : undefined,
          itemStyle: { color: metric.color ?? chartSeriesColor(index) },
          lineStyle: { color: metric.color ?? chartSeriesColor(index), width: 3 },
          z: 2,
          ...seriesValueLabel(this.showValueLabels, metric, this.compactValueLabels)
        });
      });
    } else if (utilityMetric && this.utilityDisplay() !== 'off') {
      yAxis.push(metricAxis(utilityMetric, this.yAxisTitle, this.allowNegativeValues));
      series.push({
        name: utilityMetric.label,
        type: this.utilityDisplay(),
        yAxisIndex: 0,
        data: rows.map(row => chartValue(row, utilityMetric.id)),
        smooth: this.utilityDisplay() === 'line' && rows.length > 2,
        itemStyle: { color: 'var(--v1-chart-series-1)' },
        lineStyle: { color: 'var(--v1-chart-series-1)', width: 3 },
        ...seriesValueLabel(this.showValueLabels, utilityMetric, this.compactValueLabels)
      });
    }

    if (!this.allMetricsEnabled() && costMetric && this.costDisplay() !== 'off') {
      if (!this.sharedYAxis || yAxis.length === 0) {
        yAxis.push(metricAxis(costMetric, this.yAxisTitle, this.allowNegativeValues));
      }
      series.push({
        name: costMetric.label,
        type: this.costDisplay(),
        yAxisIndex: this.sharedYAxis ? 0 : yAxis.length - 1,
        data: rows.map(row => chartValue(row, costMetric.id)),
        smooth: this.costDisplay() === 'line' && rows.length > 2,
        itemStyle: { color: 'var(--v1-chart-series-3)' },
        lineStyle: { color: 'var(--v1-chart-series-3)', width: 3 },
        ...seriesValueLabel(this.showValueLabels, costMetric, this.compactValueLabels)
      });
    }

    const alignedYAxis = alignDualYAxis(yAxis);

    return {
      tooltip: { trigger: 'axis', formatter: params => formatChartTooltip(params, this.metricOptions()) },
      legend: { top: 0, left: 'center', right: 88, data: this.visibleMetrics().map(metric => metric.label) },
      grid: { top: this.showValueLabels ? 84 : 72, right: alignedYAxis.length > 1 ? 56 : 18, bottom: this.canZoom() ? 74 : 36, left: 54, containLabel: true },
      xAxis: { type: 'category', data: rows.map(row => row.periodLabel) },
      yAxis: alignedYAxis.length > 0 ? alignedYAxis : [{ type: 'value', min: 0 }],
      dataZoom: this.canZoom()
        ? [
          { type: 'inside', start: this.zoomStart(), end: this.zoomEnd() },
          { type: 'slider', start: this.zoomStart(), end: this.zoomEnd(), bottom: 14, height: 24 }
        ]
        : [],
      series
    } as V1EChartsOption;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartRows']) {
      this.rows.set([...this.chartRows].sort((first, second) => first.sortValue - second.sortValue));
    }
    if (changes['metrics']) {
      this.metricOptions.set(this.metrics);
    }
    if (changes['state']) {
      this.chartState.set(this.state);
    }
    if (changes['period']) {
      this.chartPeriod.set(this.period);
    }
    if (changes['metrics'] || changes['defaultLeftMetricId'] || changes['defaultRightMetricId']) {
      this.syncMetricSelections();
    }
    if (changes['defaultLeftDisplay']) {
      this.utilityDisplay.set(this.defaultLeftDisplay);
    }
    if (changes['defaultRightDisplay']) {
      this.costDisplay.set(this.defaultRightDisplay);
    }
    if (changes['showAllMetrics']) {
      this.allMetricsEnabled.set(this.showAllMetrics);
    }
    if (changes['allMetricsDisplay']) {
      this.allMetricSeriesDisplay.set(this.allMetricsDisplay);
    }
    if (changes['stackSeries']) {
      this.allMetricSeriesStacked.set(this.stackSeries);
    }
    if (changes['comparisonBand']) {
      this.metricComparisonBand.set(this.comparisonBand);
    }
    if (changes['chartRows'] && !this.canZoom()) {
      this.resetZoom();
    }
  }

  setUtilityDisplay(display: MeterChartSeriesDisplay): void {
    this.utilityDisplay.set(display);
  }

  setCostDisplay(display: MeterChartSeriesDisplay): void {
    this.costDisplay.set(display);
  }

  zoomIn(): void {
    if (!this.canZoom()) {
      return;
    }
    this.setZoomRange(Math.max(10, (this.zoomEnd() - this.zoomStart()) * 0.6));
  }

  zoomOut(): void {
    if (!this.canZoom()) {
      return;
    }
    this.setZoomRange(Math.min(100, (this.zoomEnd() - this.zoomStart()) / 0.6));
  }

  resetZoom(): void {
    this.zoomStart.set(0);
    this.zoomEnd.set(100);
  }

  syncDataZoom(range: V1EChartsDataZoomRange): void {
    const start = clampPercent(range.start, this.zoomStart());
    const end = clampPercent(range.end, this.zoomEnd());
    this.zoomStart.set(Math.min(start, end));
    this.zoomEnd.set(Math.max(start, end));
  }

  downloadPng(): void {
    this.chartDirective?.downloadPng(this.downloadFileName);
  }

  private syncMetricSelections(): void {
    const metrics = this.metricOptions();
    const utilityMetric = coerceMetricId(metrics, this.defaultLeftMetricId);
    const costMetric = coerceMetricId(metrics, this.defaultRightMetricId);
    this.utilityMetricId.set(utilityMetric);
    this.costMetricId.set(costMetric === utilityMetric ? undefined : costMetric);
  }

  private setZoomRange(range: number): void {
    const center = (this.zoomStart() + this.zoomEnd()) / 2;
    const zoomRange = clamp(range, 10, 100);
    const start = clamp(center - (zoomRange / 2), 0, 100 - zoomRange);
    this.zoomStart.set(start);
    this.zoomEnd.set(start + zoomRange);
  }
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
    data: rows.slice(0, -1).map((row, index) => {
      const nextRow = rows[index + 1];
      return [
        index,
        chartValue(row, band.referenceMetricId),
        chartValue(row, band.comparisonMetricId),
        index + 1,
        chartValue(nextRow, band.referenceMetricId),
        chartValue(nextRow, band.comparisonMetricId)
      ];
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

function metricById(
  metrics: readonly MeterResultsChartMetric[],
  metricId: string | undefined
): MeterResultsChartMetric | undefined {
  return metricId ? metrics.find(metric => metric.id === metricId) : undefined;
}

function coerceMetricId(
  metrics: readonly MeterResultsChartMetric[],
  metricId: string | undefined
): string | undefined {
  return metricId && metrics.some(metric => metric.id === metricId) ? metricId : undefined;
}

function metricAxis(
  metric: MeterResultsChartMetric,
  title: string | undefined,
  allowNegativeValues: boolean
): Record<string, unknown> {
  const axis: Record<string, unknown> = {
    type: 'value',
    name: title ?? (metric.unit ? `${metric.label} (${metric.unit})` : metric.label)
  };
  if (!allowNegativeValues) {
    axis['min'] = 0;
  }
  if (metric.currency) {
    axis['axisLabel'] = { formatter: '${value}' };
  } else if (metric.unit === '%') {
    axis['axisLabel'] = { formatter: '{value}%' };
  }
  return axis;
}

function accessibleMetricLabel(metric: MeterResultsChartMetric): string {
  if (metric.currency) {
    return `${metric.label} (USD)`;
  }
  return metric.unit ? `${metric.label} (${metric.unit})` : metric.label;
}

function chartValue(row: MeterResultsChartRow, metricId: string): number {
  return Number(row.values[metricId]) || 0;
}

function metricLifetimeTotal(rows: readonly MeterResultsChartRow[], metricId: string): number {
  return rows.reduce((total, row) => total + chartValue(row, metricId), 0);
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
  metrics: readonly MeterResultsChartMetric[]
): string {
  const tooltipParams = (Array.isArray(params) ? params : [params])
    .filter(isTooltipParam)
    .filter(param => metrics.some(metric => metric.label === param.seriesName));
  const firstParam = tooltipParams[0];
  const header = firstParam ? `<div>${escapeHtml(firstParam.axisValueLabel ?? firstParam.name ?? '')}</div>` : '';
  const rows = tooltipParams
    .map(param => {
      const metric = metrics.find(item => item.label === param.seriesName);
      const value = formatChartTooltipValue(param.value, metric?.currency, metric?.unit);
      return `<div>${param.marker ?? ''}${escapeHtml(param.seriesName ?? '')}: ${escapeHtml(value)}</div>`;
    })
    .join('');
  return `${header}${rows}`;
}

function formatChartTooltipValue(value: unknown, currency = false, unit?: string): string {
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

function clampPercent(value: number, fallback: number): number {
  return Number.isFinite(value) ? clamp(value, 0, 100) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface ChartTooltipParam {
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
