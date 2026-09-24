import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, ElementRef, EventEmitter, Injector, Input, Output, ViewChild, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  PredictorDataQualityReport,
  PredictorDataQualityStatistics,
  buildPredictorDataQualityReport
} from '@domain/calculations/data-quality/predictor-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';

type PredictorQualityStatisticId = keyof PredictorDataQualityStatistics;

interface PredictorQualityStatisticCell {
  readonly id: PredictorQualityStatisticId;
  readonly label: string;
  readonly valueLabel: string;
  readonly tone?: 'success' | 'warning';
}

interface PredictorQualityFindingView {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly severity: 'error' | 'warning';
  readonly settingsAction: boolean;
  readonly item?: StatusItem;
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

const QUALITY_FINDING_CODES = new Set([
  'predictor.data.duplicate-month',
  'predictor.data.gap',
  'predictor.data.negative',
  'predictor.weather.warning',
  'predictor.quality.outlier'
]);

@Component({
  selector: 'app-predictor-workbench-quality-report',
  templateUrl: './predictor-workbench-quality-report.component.html',
  styleUrls: ['./predictor-workbench-quality-report.component.css'],
  standalone: true,
  imports: [EChartsChartDirective, IconComponent]
})
export class PredictorWorkbenchQualityReportComponent {
  private readonly copyTableService = inject(CopyTableService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  readonly status = inject(WorkspaceStatusService);

  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly copyingStatisticsTable = signal(false);
  private readonly predictorInput = signal<IdbPredictor | undefined>(undefined);
  private readonly readingsInput = signal<readonly IdbPredictorData[] | undefined>(undefined);
  private readonly findingsInput = signal<readonly StatusItem[] | undefined>(undefined);
  private readonly idPrefixInput = signal('predictor-quality');
  @Input('predictor') set predictorValue(value: IdbPredictor | undefined) { this.predictorInput.set(value); }
  @Input('readings') set readingsValue(value: readonly IdbPredictorData[] | undefined) { this.readingsInput.set(value); }
  @Input('findings') set findingsValue(value: readonly StatusItem[] | undefined) { this.findingsInput.set(value); }
  @Input() set idPrefix(value: string) { this.idPrefixInput.set(value || 'predictor-quality'); }
  @Input() embedded = false;
  @Output() readonly readingsRequested = new EventEmitter<void>();
  @Output() readonly setupRequested = new EventEmitter<void>();
  readonly predictor = computed(() => this.predictorInput() ?? this.workspace.selectedPredictor());
  readonly readings = computed(() => this.readingsInput() ?? this.workspace.selectedReadings());
  readonly ids = computed(() => ({
    findings: `${this.idPrefixInput()}-findings-heading`,
    months: `${this.idPrefixInput()}-months-heading`,
    negative: `${this.idPrefixInput()}-negative-heading`,
    weather: `${this.idPrefixInput()}-weather-heading`,
    statistics: `${this.idPrefixInput()}-statistics-heading`,
    chart: `${this.idPrefixInput()}-chart-heading`
  }));

  @ViewChild('statisticsTable', { static: false }) statisticsTable?: ElementRef<HTMLTableElement>;
  @ViewChild('qualityChart', { static: false, read: EChartsChartDirective }) qualityChart?: EChartsChartDirective;
  @ViewChild('qualityRegion', { read: ElementRef }) private readonly qualityRegion?: ElementRef<HTMLElement>;

  readonly report = computed<PredictorDataQualityReport | undefined>(() => {
    const predictor = this.predictor();
    return predictor
      ? buildPredictorDataQualityReport(this.readings(), predictor)
      : undefined;
  });
  readonly statisticCells = computed<readonly PredictorQualityStatisticCell[]>(() => {
    const report = this.report();
    if (!report?.hasUsableData) return [];
    return STATISTIC_COLUMNS.map(column => ({
      id: column.id,
      label: column.label,
      valueLabel: formatQualityNumber(report.statistics[column.id]),
      tone: column.id === 'outliers'
        ? report.outlierCount > 0 ? 'warning' : 'success'
        : undefined
    }));
  });
  readonly findings = computed<readonly PredictorQualityFindingView[]>(() => {
    const report = this.report();
    const predictor = this.predictor();
    if (!report || !predictor) return [];
    if (this.status.state() === 'ready') {
      return (this.findingsInput() ?? this.status.predictorFindings(predictor.guid))
        .filter(finding => QUALITY_FINDING_CODES.has(finding.code))
        .map(toFindingView);
    }
    return localFindings(report);
  });
  readonly qualityChartOption = computed(() => {
    const report = this.report();
    return report?.hasUsableData && report.chartRows.length > 0
      ? buildQualityChartOption(report)
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

  openReadings(): void {
    this.openTab('readings');
  }

  openSettings(): void {
    this.openTab('settings');
  }

  copyStatisticsTable(): void {
    if (!this.statisticsTable) return;
    this.copyingStatisticsTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.statisticsTable);
      this.copyingStatisticsTable.set(false);
    }, 200);
  }

  downloadQualityChart(): void {
    const predictorName = this.predictor()?.name || 'predictor';
    this.qualityChart?.downloadPng(`${slugify(predictorName)}-data-quality-readings`);
  }

  async discardWarning(item: StatusItem): Promise<void> {
    if (await this.status.discardWarning(item)) {
      afterNextRender(() => {
        if (this.qualityRegion) {
          this.focusMonitor.focusVia(this.qualityRegion, 'program');
        }
      }, { injector: this.injector });
    }
  }

  private openTab(tab: 'settings' | 'readings'): void {
    if (this.embedded) {
      if (tab === 'settings') this.setupRequested.emit();
      else this.readingsRequested.emit();
      return;
    }
    const facility = this.workspace.facility();
    const predictor = this.predictor();
    if (facility && predictor) {
      void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictor.guid, tab));
    }
  }
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'predictor';
}

function toFindingView(finding: StatusItem): PredictorQualityFindingView {
  return {
    id: finding.id,
    code: finding.code,
    title: finding.title,
    description: finding.description,
    severity: finding.severity === 'error' ? 'error' : 'warning',
    settingsAction: finding.code === 'predictor.data.negative',
    item: finding
  };
}

function localFindings(report: PredictorDataQualityReport): PredictorQualityFindingView[] {
  const findings: PredictorQualityFindingView[] = [];
  if (report.duplicateMonths.length > 0) {
    findings.push(localFinding('predictor.data.duplicate-month', 'Resolve duplicate predictor data', `${report.duplicateMonths.length} month(s) contain duplicate entries.`, 'error'));
  }
  if (report.missingMonths.length > 0) {
    findings.push(localFinding('predictor.data.gap', 'Fill missing predictor data', `${report.missingMonths.length} month(s) are missing between the first and last entry.`, 'error'));
  }
  if (!report.predictor.canBeNegative && report.negativeMonths.length > 0) {
    findings.push(localFinding('predictor.data.negative', 'Review negative predictor data', `${report.negativeMonths.length} month(s) contain negative values that are not allowed.`, 'error', true));
  }
  if (report.predictor.predictorType === 'Weather'
    && !report.predictor.ignoreWeatherDataWarning
    && (report.weatherWarningMonths.length > 0 || report.weatherChangedMonths.length > 0)) {
    findings.push(localFinding('predictor.weather.warning', 'Review weather data', 'Some weather entries contain incomplete or revised source data.', 'warning'));
  }
  if (report.outlierCount > 0) {
    findings.push(localFinding('predictor.quality.outlier', 'Review predictor outliers', `${report.outlierCount} predictor value(s) fall outside the expected range.`, 'warning'));
  }
  return findings;
}

function localFinding(
  code: string,
  title: string,
  description: string,
  severity: 'error' | 'warning',
  settingsAction = false
): PredictorQualityFindingView {
  return { id: code, code, title, description, severity, settingsAction };
}

function buildQualityChartOption(report: PredictorDataQualityReport): V1EChartsOption {
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
    markArea: expectedRangeBand(report.statistics),
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
    legend: { top: 0, left: 'center' },
    grid: { top: 60, right: 24, bottom: hasZoom ? 72 : 34, left: 70, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: value => new Date(Number(value)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }
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

function expectedRangeBand(statistics: PredictorDataQualityStatistics): Record<string, unknown> | undefined {
  if (!Number.isFinite(statistics.lowerExpectedBound)
    || !Number.isFinite(statistics.upperExpectedBound)
    || statistics.lowerExpectedBound === statistics.upperExpectedBound) {
    return undefined;
  }
  return {
    silent: true,
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
  const dateLabel = new Date(values[0].timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `<div>${escapeHtml(dateLabel)}</div>${values.map(entry =>
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
