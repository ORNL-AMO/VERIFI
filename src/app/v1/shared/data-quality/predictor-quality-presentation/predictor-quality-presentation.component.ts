import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, input, signal } from '@angular/core';
import { PredictorDataQualityReport, PredictorDataQualityStatistics } from '@domain/calculations/data-quality/predictor-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';

const reportNumber = new AnalysisResultNumberPipe();
const QUALITY_MARKER_SERIES = new Set(['Outliers', 'Weather warnings', 'Revised weather data']);

type PredictorQualityStatisticId = keyof PredictorDataQualityStatistics;

interface PredictorQualityStatisticCell {
  readonly id: PredictorQualityStatisticId;
  readonly label: string;
  readonly valueLabel: string;
  readonly tone?: 'success' | 'warning';
}

interface PredictorQualityAccessibleRow {
  readonly id: string;
  readonly dateLabel: string;
  readonly valueLabel: string;
  readonly expectedRangeLabel: string;
  readonly negativeLabel: string;
  readonly weatherStatusLabel: string;
}

const STATISTIC_COLUMNS: ReadonlyArray<{ readonly id: PredictorQualityStatisticId; readonly label: string }> = [
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
  { id: 'average', label: 'Average' },
  { id: 'median', label: 'Median' },
  { id: 'medianAbsDev', label: 'Median Absolute Deviation (MAD)' },
  { id: 'lowerExpectedBound', label: 'Median - 5 MAD' },
  { id: 'upperExpectedBound', label: 'Median + 5 MAD' },
  { id: 'outliers', label: 'Number of Outliers' }
];

@Component({
  selector: 'app-predictor-quality-presentation', standalone: false,
  host: { '[class.report-statistics]': 'reportStatistics()' },
  templateUrl: './predictor-quality-presentation.component.html',
  styleUrls: ['./predictor-quality-presentation.component.css']
})
export class PredictorQualityPresentationComponent {
  readonly report = input.required<PredictorDataQualityReport>();
  readonly idPrefix = input.required<string>();
  readonly headingLevel = input(2);
  readonly showStatistics = input(true);
  readonly showChart = input(true);
  readonly showExpectedRangeLabel = input(true);
  readonly reportStatistics = input(false);
  readonly chartHeading = input('Readings over time');
  readonly chartFileName = input('predictor-data-quality-readings');
  private readonly copyTableService = inject(CopyTableService);
  private copyTimer?: ReturnType<typeof setTimeout>;
  readonly copyingStatisticsTable = signal(false);
  @ViewChild('statisticsTable') statisticsTable?: ElementRef<HTMLTableElement>;
  @ViewChild('qualityChart', { read: EChartsChartDirective }) qualityChart?: EChartsChartDirective;
  constructor() { inject(DestroyRef).onDestroy(() => { if (this.copyTimer) clearTimeout(this.copyTimer); }); }
  readonly statisticCells = computed<readonly PredictorQualityStatisticCell[]>(() => {
    const report = this.report();
    if (!report?.hasUsableData) return [];
    return STATISTIC_COLUMNS.map(column => ({
      id: column.id,
      label: column.label,
      valueLabel: this.reportStatistics() ? reportNumber.transform(report.statistics[column.id]) : formatQualityNumber(report.statistics[column.id]),
      tone: column.id === 'outliers'
        ? report.outlierCount > 0 ? 'warning' : 'success'
        : undefined
    }));
  });
  readonly qualityChartOption = computed(() => {
    const report = this.report();
    return this.showChart() && report?.hasUsableData && report.chartRows.length > 0
      ? buildQualityChartOption(report, this.showExpectedRangeLabel())
      : undefined;
  });
  readonly accessibleChartRows = computed<readonly PredictorQualityAccessibleRow[]>(() =>
    (this.report()?.chartRows ?? []).map(row => ({
      id: row.reading.guid,
      dateLabel: row.dateLabel,
      valueLabel: formatQualityNumber(row.value),
      expectedRangeLabel: row.outlier ? 'Outlier' : 'Expected range',
      negativeLabel: row.negative ? 'Negative' : 'Not negative',
      weatherStatusLabel: weatherStatusLabel(row.weatherWarning, row.weatherChanged)
    }))
  );

  copyStatisticsTable(): void {
    if (!this.statisticsTable || this.copyTimer) return;
    this.copyingStatisticsTable.set(true);
    const table = this.statisticsTable;
    this.copyTimer = setTimeout(() => {
      this.copyTimer = undefined;
      try { this.copyTableService.copyTable(table); }
      finally { this.copyingStatisticsTable.set(false); }
    }, 200);
  }
  downloadQualityChart(): void { this.qualityChart?.downloadPng(this.chartFileName()); }
}

function buildQualityChartOption(report: PredictorDataQualityReport, showExpectedRangeLabel: boolean): V1EChartsOption {
  const rows = report.chartRows;
  const hasZoom = rows.length > 2;
  const lineData = rows.map(row => [row.sortValue, row.value]);
  const outlierData = rows.filter(row => row.outlier).map(row => ({ name: row.dateLabel, value: [row.sortValue, row.value] }));
  const weatherWarningData = rows.filter(row => row.weatherWarning).map(row => ({ name: row.dateLabel, value: [row.sortValue, row.value] }));
  const weatherChangedData = rows.filter(row => row.weatherChanged).map(row => ({ name: row.dateLabel, value: [row.sortValue, row.value] }));
  const missingMarkerValue = missingMonthMarkerValue(report.statistics);
  const missingData = report.missingMonths.map(month => ({
    name: month.monthLabel,
    value: [Date.UTC(month.year, month.month - 1, 1), missingMarkerValue]
  }));
  const series: Array<Record<string, unknown>> = [{
    name: 'Predictor values',
    type: 'line',
    data: lineData,
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 8,
    itemStyle: { color: 'var(--v1-chart-series-1)', borderColor: '#ffffff', borderWidth: 2 },
    lineStyle: { color: 'var(--v1-chart-series-1)', width: 3 },
    markArea: expectedRangeBand(report.statistics, showExpectedRangeLabel),
    z: 2
  }];
  if (outlierData.length > 0) {
    series.push({
      name: 'Outliers', type: 'scatter', data: outlierData, symbol: 'diamond', symbolSize: 15,
      itemStyle: { color: 'var(--v1-danger)', borderColor: '#ffffff', borderWidth: 2 }, z: 5
    });
  }
  if (weatherWarningData.length > 0) {
    series.push({
      name: 'Weather warnings', type: 'scatter', data: weatherWarningData, symbol: 'triangle', symbolSize: 15,
      itemStyle: { color: 'var(--v1-warning)', borderColor: '#ffffff', borderWidth: 2 }, z: 4
    });
  }
  if (weatherChangedData.length > 0) {
    series.push({
      name: 'Revised weather data', type: 'scatter', data: weatherChangedData, symbol: 'pin', symbolSize: 18,
      itemStyle: { color: 'var(--v1-chart-series-3)', borderColor: '#ffffff', borderWidth: 2 }, z: 4
    });
  }
  if (missingData.length > 0) {
    series.push({
      name: 'Missing months', type: 'scatter', data: missingData, symbol: 'emptyCircle', symbolSize: 14,
      itemStyle: { color: 'var(--v1-warning)', borderWidth: 3 }, z: 3
    });
  }

  return {
    tooltip: { trigger: 'axis', formatter: formatChartTooltip },
    legend: { type: 'scroll', top: 0, left: 'center', width: '90%' },
    grid: { top: 60, right: 24, bottom: hasZoom ? 72 : 34, left: 70, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: { hideOverlap: true, formatter: value => new Date(Number(value)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) }
    },
    yAxis: {
      type: 'value',
      name: report.unit ? `${report.predictor.name} (${report.unit})` : report.predictor.name,
      nameLocation: 'end',
      nameGap: 12,
      nameTextStyle: { align: 'left', padding: [0, 0, 0, -48] },
      axisLabel: { formatter: (value: number) => formatQualityNumber(value) }
    },
    dataZoom: hasZoom
      ? [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, bottom: 14, height: 24 }
      ]
      : [],
    series
  } as V1EChartsOption;
}

function expectedRangeBand(statistics: PredictorDataQualityStatistics, showLabel: boolean): Record<string, unknown> | undefined {
  if (!Number.isFinite(statistics.lowerExpectedBound)
    || !Number.isFinite(statistics.upperExpectedBound)
    || statistics.lowerExpectedBound === statistics.upperExpectedBound) {
    return undefined;
  }
  return {
    silent: true,
    label: { show: showLabel },
    itemStyle: { color: 'var(--v1-chart-annotation)', opacity: 0.18 },
    emphasis: { disabled: true },
    data: [[
      { name: 'Expected range', yAxis: statistics.lowerExpectedBound },
      { yAxis: statistics.upperExpectedBound }
    ]]
  };
}

function missingMonthMarkerValue(statistics: PredictorDataQualityStatistics): number {
  if (Number.isFinite(statistics.lowerExpectedBound)) return statistics.lowerExpectedBound;
  if (Number.isFinite(statistics.min)) return statistics.min;
  return 0;
}

function formatChartTooltip(params: unknown): string {
  const entries = Array.isArray(params) ? params : [params];
  const values = entries.map(tooltipEntry).filter((entry): entry is { seriesName: string; timestamp: number; value: number } => !!entry);
  if (values.length === 0) return '';
  const displayed = values.filter(entry => !QUALITY_MARKER_SERIES.has(entry.seriesName));
  const readingKeys = new Set(displayed.filter(entry => entry.seriesName === 'Predictor values')
    .map(entry => `${entry.timestamp}:${entry.value}`));
  for (const entry of values) {
    if (!QUALITY_MARKER_SERIES.has(entry.seriesName)) continue;
    const key = `${entry.timestamp}:${entry.value}`;
    if (readingKeys.has(key)) continue;
    displayed.push({ ...entry, seriesName: 'Predictor values' });
    readingKeys.add(key);
  }
  const dateLabel = new Date(values[0].timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `<div>${escapeHtml(dateLabel)}</div>${displayed.map(entry =>
    `<div>${escapeHtml(entry.seriesName)}: ${entry.seriesName === 'Missing months' ? 'No reading' : escapeHtml(formatQualityNumber(entry.value))}</div>`
  ).join('')}`;
}

function tooltipEntry(param: unknown): { seriesName: string; timestamp: number; value: number } | undefined {
  if (typeof param !== 'object' || param === null || !('value' in param)) return undefined;
  const value = (param as { value?: unknown }).value;
  if (!Array.isArray(value) || value.length < 2) return undefined;
  return {
    seriesName: String((param as { seriesName?: unknown }).seriesName ?? ''),
    timestamp: Number(value[0]),
    value: Number(value[1])
  };
}

function formatQualityNumber(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function weatherStatusLabel(warning: boolean, changed: boolean): string {
  if (warning && changed) return 'Incomplete and revised source data';
  if (warning) return 'Incomplete source data';
  if (changed) return 'Revised source data';
  return 'No source warning';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] ?? character);
}
