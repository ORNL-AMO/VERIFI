import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  MeterDataQualityChartRow,
  MeterDataQualityReport,
  Statistics,
  buildMeterDataQualityReport
} from '@domain/calculations/data-quality/meter-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { meterWorkbenchTab } from '@app/v1/facility/data/meters/facility-meters.models';

type QualityStatisticColumnId = keyof Statistics;

interface QualityStatisticCell {
  readonly id: QualityStatisticColumnId;
  readonly label: string;
  readonly valueLabel: string;
  readonly tone?: 'success' | 'warning';
}

interface QualityStatisticRow {
  readonly id: 'consumption' | 'cost';
  readonly label: string;
  readonly cells: readonly QualityStatisticCell[];
}

interface QualityChartPlot {
  readonly metric: 'consumption' | 'cost';
  readonly title: string;
  readonly unit: string;
  readonly currency: boolean;
  readonly stats: Statistics;
  readonly color: string;
}

const QUALITY_STATISTIC_COLUMNS: ReadonlyArray<{ readonly id: QualityStatisticColumnId; readonly label: string }> = [
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
  { id: 'average', label: 'Average' },
  { id: 'median', label: 'Median' },
  { id: 'medianAbsDev', label: 'Median Absolute Deviation (MAD)' },
  { id: 'medianminus2_5MAD', label: 'Median - 5 MAD' },
  { id: 'medianplus2_5MAD', label: 'Median + 5 MAD' },
  { id: 'outliers', label: 'Number of Outliers' }
];

@Component({
  selector: 'app-meter-workbench-quality-report',
  templateUrl: './meter-workbench-quality-report.component.html',
  styleUrls: ['./meter-workbench-quality-report.component.css'],
  standalone: false
})
export class MeterWorkbenchQualityReportComponent {
  private readonly copyTableService = inject(CopyTableService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

  readonly tab = meterWorkbenchTab('quality');
  readonly statisticTableColspan = QUALITY_STATISTIC_COLUMNS.length + 1;
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly meterData = this.workspace.selectedMeterData;
  readonly copyingStatisticsTable = signal(false);

  @ViewChild('statisticsTable', { static: false }) statisticsTable?: ElementRef<HTMLTableElement>;
  @ViewChild('qualityChart', { static: false, read: EChartsChartDirective }) qualityChart?: EChartsChartDirective;

  readonly report = computed<MeterDataQualityReport | undefined>(() => {
    const selectedMeter = this.meter();
    if (!selectedMeter) {
      return undefined;
    }
    return buildMeterDataQualityReport(this.meterData(), selectedMeter);
  });
  readonly statisticRows = computed(() => {
    const report = this.report();
    if (!report) {
      return [];
    }
    return buildStatisticRows(report);
  });
  readonly issueSummaries = computed(() => {
    const report = this.report();
    if (!report) {
      return [];
    }
    return buildIssueSummaries(report);
  });
  readonly hasConsumptionChartData = computed(() => {
    const report = this.report();
    return !!report?.showConsumption && report.chartRows.some(row => row.consumptionValue !== undefined);
  });
  readonly hasCostChartData = computed(() => {
    const report = this.report();
    return !!report?.includeCosts && report.chartRows.some(row => row.costValue !== undefined);
  });
  readonly qualityChartOption = computed(() => {
    const report = this.report();
    if (!report) {
      return undefined;
    }
    const plots: QualityChartPlot[] = [];
    if (this.hasConsumptionChartData()) {
      plots.push({
        metric: 'consumption',
        title: 'Total Consumption',
        unit: report.unit,
        currency: false,
        stats: report.energyStats,
        color: 'var(--v1-chart-series-1)'
      });
    }
    if (this.hasCostChartData()) {
      plots.push({
        metric: 'cost',
        title: 'Total Cost',
        unit: '$',
        currency: true,
        stats: report.costStats,
        color: 'var(--v1-chart-series-2)'
      });
    }
    return plots.length ? qualityChartOption(report.chartRows, plots) : undefined;
  });

  openReadings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'readings'));
    }
  }

  copyStatisticsTable(): void {
    if (!this.statisticsTable) {
      return;
    }
    this.copyingStatisticsTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.statisticsTable);
      this.copyingStatisticsTable.set(false);
    }, 200);
  }

  downloadQualityChart(): void {
    this.qualityChart?.downloadPng('meter-data-quality-readings');
  }
}

function buildStatisticRows(report: MeterDataQualityReport): QualityStatisticRow[] {
  const rows: QualityStatisticRow[] = [];
  if (report.showConsumption) {
    rows.push(statisticRow(
      'consumption',
      `Total Consumption (${report.unit})`,
      report.energyStats,
      false
    ));
  }
  if (report.includeCosts) {
    rows.push(statisticRow('cost', 'Total Cost ($)', report.costStats, true));
  }
  return rows;
}

function statisticRow(
  id: QualityStatisticRow['id'],
  label: string,
  stats: Statistics,
  currency: boolean
): QualityStatisticRow {
  const hasStatistics = hasFiniteStatistics(stats);
  return {
    id,
    label,
    cells: QUALITY_STATISTIC_COLUMNS.map(column => ({
      id: column.id,
      label: column.label,
      valueLabel: hasStatistics ? formatQualityNumber(stats[column.id], currency && column.id !== 'outliers') : '-',
      tone: column.id === 'outliers' && hasStatistics
        ? stats.outliers > 0 ? 'warning' : 'success'
        : undefined
    }))
  };
}

function buildIssueSummaries(report: MeterDataQualityReport): string[] {
  const issues: string[] = [];
  if (report.showConsumption && report.energyOutlierCount > 0) {
    issues.push(`${report.energyOutlierCount} consumption reading${report.energyOutlierCount === 1 ? '' : 's'} outside the expected range.`);
  }
  if (report.includeCosts && report.costOutlierCount > 0) {
    issues.push(`${report.costOutlierCount} cost reading${report.costOutlierCount === 1 ? '' : 's'} outside the expected range.`);
  }
  if (report.duplicateMonths.length > 0) {
    issues.push(`${report.duplicateMonths.length} month${report.duplicateMonths.length === 1 ? '' : 's'} with multiple readings.`);
  }
  return issues;
}

function qualityChartOption(rows: readonly MeterDataQualityChartRow[], plots: readonly QualityChartPlot[]): V1EChartsOption {
  const zoomedXAxisIndexes = plots.map((_, index) => index);
  const hasZoom = rows.length > 2;
  const dateExtent = chartDateExtent(rows);

  return {
    tooltip: { trigger: 'axis', formatter: params => formatChartTooltip(params, plots) },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    legend: { top: 0, left: 'center' },
    grid: buildChartGrids(plots.length, hasZoom),
    xAxis: plots.map((_, index) => ({
      type: 'time',
      gridIndex: index,
      min: dateExtent?.min,
      max: dateExtent?.max,
      axisLabel: index === plots.length - 1
        ? { formatter: value => new Date(Number(value)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }
        : { show: false },
      axisTick: { show: index === plots.length - 1 },
      axisLine: { show: index === plots.length - 1 }
    })),
    yAxis: plots.map((plot, index) => ({
      type: 'value',
      gridIndex: index,
      name: yAxisName(plot),
      nameLocation: 'end',
      nameGap: 12,
      nameTextStyle: { align: 'left', padding: [0, 0, 0, -48] },
      axisLabel: {
        show: true,
        formatter: (value: number) => formatAxisTick(value, plot.currency)
      }
    })),
    dataZoom: hasZoom
      ? [
        { type: 'inside', xAxisIndex: zoomedXAxisIndexes, start: 0, end: 100 },
        { type: 'slider', xAxisIndex: zoomedXAxisIndexes, start: 0, end: 100, bottom: 14, height: 24 }
      ]
      : [],
    series: plots.flatMap((plot, index) => buildPlotSeries(rows, plot, index))
  } as V1EChartsOption;
}

function hasFiniteStatistics(stats: Statistics): boolean {
  return Number.isFinite(stats.min) && Number.isFinite(stats.max);
}

function chartDateExtent(rows: readonly MeterDataQualityChartRow[]): { min: number; max: number } | undefined {
  const sortValues = rows
    .map(row => row.sortValue)
    .filter(Number.isFinite);
  if (!sortValues.length) {
    return undefined;
  }
  return {
    min: Math.min(...sortValues),
    max: Math.max(...sortValues)
  };
}

function buildChartGrids(plotCount: number, hasZoom: boolean): Array<Record<string, unknown>> {
  if (plotCount === 1) {
    return [{ top: 60, right: 24, bottom: hasZoom ? 72 : 34, left: 70, containLabel: true }];
  }
  return [
    { top: 60, right: 24, height: hasZoom ? '33%' : '37%', left: 70, containLabel: true },
    { top: hasZoom ? '56%' : '59%', right: 24, bottom: hasZoom ? 72 : 34, left: 70, containLabel: true }
  ];
}

function yAxisName(plot: QualityChartPlot): string {
  return plot.currency ? 'Total Cost ($)' : `${plot.title} (${plot.unit})`;
}

function formatAxisTick(value: number, currency: boolean): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: currency ? 'currency' : 'decimal',
    currency: currency ? 'USD' : undefined
  }).format(value);
}

function buildPlotSeries(
  rows: readonly MeterDataQualityChartRow[],
  plot: QualityChartPlot,
  axisIndex: number
): Array<Record<string, unknown>> {
  const valueKey = plot.metric === 'consumption' ? 'consumptionValue' : 'costValue';
  const outlierKey = plot.metric === 'consumption' ? 'consumptionOutlier' : 'costOutlier';
  const chartRows = rows.filter(row => row[valueKey] !== undefined);
  const lineData = chartRows.map(row => [row.sortValue, row[valueKey]]);
  const outlierData = chartRows
    .filter(row => row[outlierKey])
    .map(row => ({ name: row.dateLabel, value: [row.sortValue, row[valueKey]] }));
  const series: Array<Record<string, unknown>> = [{
    name: plot.title,
    type: 'line',
    xAxisIndex: axisIndex,
    yAxisIndex: axisIndex,
    data: lineData,
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 8,
    itemStyle: { color: plot.color, borderColor: '#ffffff', borderWidth: 2 },
    lineStyle: { color: plot.color, width: 3 },
    markArea: buildExpectedRangeBand(plot.stats),
    z: 2
  }];

  if (outlierData.length) {
    series.push({
      name: `${plot.title} Outliers`,
      type: 'scatter',
      xAxisIndex: axisIndex,
      yAxisIndex: axisIndex,
      data: outlierData,
      symbol: 'diamond',
      symbolSize: 14,
      itemStyle: { color: 'var(--v1-danger)', borderColor: '#ffffff', borderWidth: 2 },
      tooltip: { show: false },
      z: 3
    });
  }

  return series;
}

function buildExpectedRangeBand(stats: Statistics): Record<string, unknown> | undefined {
  const lowerBound = stats.medianminus2_5MAD;
  const upperBound = stats.medianplus2_5MAD;
  if (!Number.isFinite(lowerBound) || !Number.isFinite(upperBound) || lowerBound === upperBound) {
    return undefined;
  }
  return {
    silent: true,
    itemStyle: { color: 'var(--v1-chart-annotation)', opacity: 0.18 },
    emphasis: { disabled: true },
    data: [[
      { name: 'Expected range', yAxis: lowerBound },
      { yAxis: upperBound }
    ]]
  };
}

function formatChartTooltip(params: unknown, plots: readonly QualityChartPlot[]): string {
  const tooltipParams = Array.isArray(params) ? params : [params];
  const firstValue = tooltipParams.map(param => tooltipParamValue(param)).find(value => value !== undefined);
  if (!firstValue) {
    return '';
  }
  const [timestamp] = firstValue;
  const dateLabel = new Date(Number(timestamp)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const rows = tooltipParams
    .map(param => tooltipParamDisplay(param, plots))
    .filter((value): value is string => value !== undefined);
  if (!rows.length) {
    return '';
  }
  return `<div>${escapeHtml(dateLabel)}</div>${rows.join('')}`;
}

function tooltipParamValue(param: unknown): [number, number] | undefined {
  if (typeof param !== 'object' || param === null || !('value' in param)) {
    return undefined;
  }
  const value = (param as { value?: unknown }).value;
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }
  return [Number(value[0]), Number(value[1])];
}

function tooltipParamDisplay(param: unknown, plots: readonly QualityChartPlot[]): string | undefined {
  if (typeof param !== 'object' || param === null || !('seriesName' in param)) {
    return undefined;
  }
  const seriesName = String((param as { seriesName?: unknown }).seriesName);
  const plot = plots.find(candidate =>
    candidate.title === seriesName || `${candidate.title} Outliers` === seriesName
  );
  const value = tooltipParamValue(param);
  if (!plot || !value) {
    return undefined;
  }
  const valueLabel = formatQualityNumber(value[1], plot.currency);
  const suffix = plot.currency ? '' : ` ${plot.unit}`;
  return `<div>${escapeHtml(seriesName)}: ${escapeHtml(valueLabel)}${escapeHtml(suffix)}</div>`;
}

function formatQualityNumber(value: number, currency = false): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: currency ? 2 : 1,
    minimumFractionDigits: currency ? 2 : 0,
    style: currency ? 'currency' : 'decimal',
    currency: currency ? 'USD' : undefined
  }).format(value);
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
