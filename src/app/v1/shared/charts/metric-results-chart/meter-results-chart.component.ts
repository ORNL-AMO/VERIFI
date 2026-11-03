import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewChild, EventEmitter, Output, computed, signal } from '@angular/core';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { accessibleMetricLabel, chartValue, clamp, clampPercent, coerceMetricId, formatChartAccessibleValue,
  MeterChartSeriesDisplay, metricById, metricLifetimeTotal, metricResultsChartOption } from './metric-results-chart-option';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  MeterResultsChartComparisonBand,
  MeterResultsChartMetric,
  MeterResultsChartRow,
  MeterResultsPeriod
} from '../metric-results-chart.models';

type MeterChartState = 'idle' | 'loading' | 'ready' | 'error';


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
  @Input() showLegend = true;
  /** Short tick labels and minimal gutters for embedded dashboard charts. */
  @Input() compactAxes = false;
  @Input() tooltipMaxRows?: number;
  @Input() tooltipOverflowHint = 'Use the legend to show fewer series.';
  @Input() smoothLines = true;
  @Input() highlightedMetricId?: string;
  @Input() showPointSymbols = true;
  @Input() showChartActions = true;
  @Input() zoomRange?: V1EChartsDataZoomRange;
  @Output() zoomRangeChanged = new EventEmitter<V1EChartsDataZoomRange>();
  private readonly optionRevision = signal(0);
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
  @Input() noVisibleSeriesTitle = 'No visible series';
  @Input() noVisibleSeriesDescription = 'Turn on a chart series to show the chart.';
  @Input() emptyTitle = 'No results to chart';
  @Input() emptyDescription = 'Add meter data to see charted results.';
  @Input() downloadFileName = 'meter-results-chart';
  @Input() joinsFollowingSection = false;
  @Input() embedded = false;
  @Input() deferUntilVisible = false;
  /** Use for dense, multi-chart result views where each chart shares the available workspace height. */
  @Input() compact = false;

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
        valueLabel: formatChartAccessibleValue(chartValue(row, metric.id), !!metric.currency, metric.unit)
      }))
    }));
  });
  readonly accessiblePeriodHeader = computed(() => this.chartPeriod() === 'yearly' ? 'Fiscal year' : 'Month');
  readonly hasChartSeries = computed(() => {
    return this.rows().length > 0
      && this.visibleMetrics().length > 0;
  });
  readonly chartOption = computed<V1EChartsOption>(() => {
    this.optionRevision();
    return metricResultsChartOption({
      rows: this.rows(), metrics: this.metricOptions(), leftMetricId: this.utilityMetricId(), rightMetricId: this.costMetricId(),
      leftDisplay: this.utilityDisplay(), rightDisplay: this.costDisplay(), allMetrics: this.allMetricsEnabled(),
      allMetricsDisplay: this.allMetricSeriesDisplay(), stackSeries: this.allMetricSeriesStacked(), comparisonBand: this.metricComparisonBand(),
      highlightedMetricId: this.highlightedMetricId, sharedYAxis: this.sharedYAxis, yAxisTitle: this.yAxisTitle,
      allowNegativeValues: this.allowNegativeValues, compactAxes: this.compactAxes, smoothLines: this.smoothLines,
      showPointSymbols: this.showPointSymbols, showValueLabels: this.showValueLabels, compactValueLabels: this.compactValueLabels,
      showLegend: this.showLegend, tooltipMaxRows: this.tooltipMaxRows, tooltipOverflowHint: this.tooltipOverflowHint,
      zoomStart: this.zoomStart(), zoomEnd: this.zoomEnd()
    });
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
      this.resetZoom(false);
    }
    if (changes['zoomRange'] && this.zoomRange) {
      this.zoomStart.set(clampPercent(this.zoomRange.start, 0));
      this.zoomEnd.set(clampPercent(this.zoomRange.end, 100));
    }
    this.optionRevision.update(value => value + 1);
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

  resetZoom(emit = true): void {
    this.zoomStart.set(0);
    this.zoomEnd.set(100);
    if (emit) this.zoomRangeChanged.emit({ start: 0, end: 100 });
  }

  syncDataZoom(range: V1EChartsDataZoomRange): void {
    const start = clampPercent(range.start, this.zoomStart());
    const end = clampPercent(range.end, this.zoomEnd());
    this.zoomStart.set(Math.min(start, end));
    this.zoomEnd.set(Math.max(start, end));
    this.zoomRangeChanged.emit({ start: this.zoomStart(), end: this.zoomEnd() });
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
