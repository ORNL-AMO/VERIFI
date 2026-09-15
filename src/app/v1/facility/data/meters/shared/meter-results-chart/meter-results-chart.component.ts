import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewChild, computed, signal } from '@angular/core';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterResultsChartMetric, MeterResultsChartRow, MeterResultsPeriod } from '../../facility-meters.models';

type MeterChartState = 'idle' | 'loading' | 'ready' | 'error';
type MeterChartSeriesDisplay = 'off' | 'bar' | 'line';

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
  readonly zoomStart = signal(0);
  readonly zoomEnd = signal(100);
  readonly utilityMetric = computed(() => metricById(this.metricOptions(), this.utilityMetricId()));
  readonly costMetric = computed(() => metricById(this.metricOptions(), this.costMetricId()));
  readonly canZoom = computed(() => this.rows().length > 2);
  readonly visibleMetrics = computed<readonly MeterResultsChartMetric[]>(() => {
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
        valueLabel: formatChartTooltipValue(chartValue(row, metric.id), !!metric.currency)
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

    if (utilityMetric && this.utilityDisplay() !== 'off') {
      yAxis.push(metricAxis(utilityMetric));
      series.push({
        name: utilityMetric.label,
        type: this.utilityDisplay(),
        yAxisIndex: 0,
        data: rows.map(row => chartValue(row, utilityMetric.id)),
        smooth: this.utilityDisplay() === 'line' && rows.length > 2,
        itemStyle: { color: 'var(--v1-chart-series-1)' },
        lineStyle: { color: 'var(--v1-chart-series-1)', width: 3 }
      });
    }

    if (costMetric && this.costDisplay() !== 'off') {
      yAxis.push(metricAxis(costMetric));
      series.push({
        name: costMetric.label,
        type: this.costDisplay(),
        yAxisIndex: yAxis.length - 1,
        data: rows.map(row => chartValue(row, costMetric.id)),
        smooth: this.costDisplay() === 'line' && rows.length > 2,
        itemStyle: { color: 'var(--v1-chart-series-3)' },
        lineStyle: { color: 'var(--v1-chart-series-3)', width: 3 }
      });
    }

    const alignedYAxis = alignDualYAxis(yAxis);

    return {
      tooltip: { trigger: 'axis', formatter: params => formatChartTooltip(params, this.metricOptions()) },
      legend: { top: 0, left: 'center', right: 88 },
      grid: { top: 72, right: alignedYAxis.length > 1 ? 56 : 18, bottom: this.canZoom() ? 74 : 36, left: 54, containLabel: true },
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

function metricAxis(metric: MeterResultsChartMetric): Record<string, unknown> {
  const axis: Record<string, unknown> = {
    type: 'value',
    name: metric.unit ? `${metric.label} (${metric.unit})` : metric.label,
    min: 0
  };
  if (metric.currency) {
    axis['axisLabel'] = { formatter: '${value}' };
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
  const tooltipParams = Array.isArray(params) ? params : [params];
  const firstParam = tooltipParams.find(isTooltipParam);
  const header = firstParam ? `<div>${escapeHtml(firstParam.axisValueLabel ?? firstParam.name ?? '')}</div>` : '';
  const rows = tooltipParams
    .filter(isTooltipParam)
    .map(param => {
      const metric = metrics.find(item => item.label === param.seriesName);
      const value = formatChartTooltipValue(param.value, metric?.currency);
      return `<div>${param.marker ?? ''}${escapeHtml(param.seriesName ?? '')}: ${escapeHtml(value)}</div>`;
    })
    .join('');
  return `${header}${rows}`;
}

function formatChartTooltipValue(value: unknown, currency = false): string {
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
