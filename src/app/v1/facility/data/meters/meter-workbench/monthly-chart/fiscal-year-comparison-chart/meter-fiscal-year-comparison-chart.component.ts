import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewChild, computed, signal } from '@angular/core';
import { MonthlyData } from '@data/models/calanderization';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterResultsChartMetric, meterHasLifetimeCost } from '../../../facility-meters.models';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const FISCAL_YEAR_COLORS = [
  '#4269d0',
  '#efb118',
  '#ff725c',
  '#6cc5b0',
  '#3ca951',
  '#ff8ab7',
  '#a463f2',
  '#97bbf5',
  '#9c6b4e',
  '#9498a0',
  '#1f7a8c',
  '#b65d1f',
  '#7a5195',
  '#667a1f',
  '#b23a48'
] as const;

export interface MeterFiscalYearComparisonSeries {
  readonly year: number;
  readonly label: string;
  readonly utilityValues: readonly (number | null)[];
  readonly costValues: readonly (number | null)[];
}

export interface MeterFiscalYearComparisonData {
  readonly monthIndexes: readonly number[];
  readonly monthLabels: readonly string[];
  readonly series: readonly MeterFiscalYearComparisonSeries[];
  readonly hasCost: boolean;
}

interface AccessibleColumn {
  readonly id: string;
  readonly label: string;
}

interface AccessibleCell {
  readonly id: string;
  readonly valueLabel: string;
}

interface AccessibleRow {
  readonly monthIndex: number;
  readonly monthLabel: string;
  readonly cells: readonly AccessibleCell[];
}

@Component({
  selector: 'app-meter-fiscal-year-comparison-chart',
  templateUrl: './meter-fiscal-year-comparison-chart.component.html',
  styleUrls: ['./meter-fiscal-year-comparison-chart.component.css'],
  standalone: true,
  imports: [CommonModule, EChartsChartDirective, IconComponent]
})
export class MeterFiscalYearComparisonChartComponent implements OnChanges {
  @Input() monthlyRows: readonly MonthlyData[] = [];
  @Input() utilityMetric?: MeterResultsChartMetric;
  @Input() costMetric?: MeterResultsChartMetric;
  @Input() fiscalYearStartMonth = 0;
  @Input() usesFiscalYearLabels = false;

  @ViewChild(EChartsChartDirective) chartDirective?: EChartsChartDirective;

  private readonly rows = signal<readonly MonthlyData[]>([]);
  private readonly utility = signal<MeterResultsChartMetric | undefined>(undefined);
  private readonly cost = signal<MeterResultsChartMetric | undefined>(undefined);
  private readonly startMonth = signal(0);
  private readonly fiscalLabels = signal(false);

  readonly comparison = computed(() => buildMeterFiscalYearComparisonData(
    this.rows(),
    this.utility(),
    this.cost(),
    this.startMonth(),
    this.fiscalLabels()
  ));
  readonly accessibleColumns = computed<readonly AccessibleColumn[]>(() => {
    const comparison = this.comparison();
    const utilityMetric = this.utility();
    const costMetric = this.cost();
    if (!utilityMetric) {
      return [];
    }
    return comparison.series.flatMap(series => [
      {
        id: `${series.year}-utility`,
        label: `${series.label} ${metricLabel(utilityMetric)}`
      },
      ...(comparison.hasCost && costMetric
        ? [{ id: `${series.year}-cost`, label: `${series.label} ${metricLabel(costMetric)}` }]
        : [])
    ]);
  });
  readonly accessibleRows = computed<readonly AccessibleRow[]>(() => {
    const comparison = this.comparison();
    return comparison.monthIndexes.map((monthIndex, index) => ({
      monthIndex,
      monthLabel: comparison.monthLabels[index],
      cells: comparison.series.flatMap(series => [
        {
          id: `${series.year}-utility`,
          valueLabel: formatMetricValue(series.utilityValues[index], false)
        },
        ...(comparison.hasCost
          ? [{
            id: `${series.year}-cost`,
            valueLabel: formatMetricValue(series.costValues[index], true)
          }]
          : [])
      ])
    }));
  });
  readonly chartOption = computed<V1EChartsOption>(() => fiscalYearComparisonOption(
    this.comparison(),
    this.utility(),
    this.cost()
  ));
  readonly ariaLabel = computed(() => {
    const utilityLabel = this.utility()?.label ?? 'utility';
    return this.comparison().hasCost
      ? `Monthly ${utilityLabel} and Total Cost comparison by fiscal year`
      : `Monthly ${utilityLabel} comparison by fiscal year`;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['monthlyRows']) {
      this.rows.set(this.monthlyRows);
    }
    if (changes['utilityMetric']) {
      this.utility.set(this.utilityMetric);
    }
    if (changes['costMetric']) {
      this.cost.set(this.costMetric);
    }
    if (changes['fiscalYearStartMonth']) {
      this.startMonth.set(normalizeMonth(this.fiscalYearStartMonth));
    }
    if (changes['usesFiscalYearLabels']) {
      this.fiscalLabels.set(this.usesFiscalYearLabels);
    }
  }

  downloadPng(): void {
    this.chartDirective?.downloadPng('meter-monthly-fiscal-year-comparison');
  }
}

export function buildMeterFiscalYearComparisonData(
  monthlyRows: readonly MonthlyData[],
  utilityMetric: MeterResultsChartMetric | undefined,
  costMetric: MeterResultsChartMetric | undefined,
  fiscalYearStartMonth: number,
  usesFiscalYearLabels: boolean
): MeterFiscalYearComparisonData {
  const startMonth = normalizeMonth(fiscalYearStartMonth);
  const monthIndexes = Array.from({ length: 12 }, (_, index) => (startMonth + index) % 12);
  const monthLabels = monthIndexes.map(monthIndex => MONTH_LABELS[monthIndex]);
  if (!utilityMetric) {
    return { monthIndexes, monthLabels, series: [], hasCost: false };
  }

  const years = [...new Set(monthlyRows.map(row => row.fiscalYear))]
    .filter(Number.isFinite)
    .sort((first, second) => first - second);
  const rowsByYearAndMonth = new Map(monthlyRows.map(row => [`${row.fiscalYear}-${row.monthNumValue}`, row]));
  const hasCost = !!costMetric && meterHasLifetimeCost(monthlyRows);
  const series = years.map(year => ({
    year,
    label: usesFiscalYearLabels ? `FY ${year}` : String(year),
    utilityValues: monthIndexes.map(monthIndex => metricValue(rowsByYearAndMonth.get(`${year}-${monthIndex}`), utilityMetric.id)),
    costValues: monthIndexes.map(monthIndex => hasCost && costMetric
      ? metricValue(rowsByYearAndMonth.get(`${year}-${monthIndex}`), costMetric.id)
      : null)
  }));

  return { monthIndexes, monthLabels, series, hasCost };
}

function fiscalYearComparisonOption(
  comparison: MeterFiscalYearComparisonData,
  utilityMetric: MeterResultsChartMetric | undefined,
  costMetric: MeterResultsChartMetric | undefined
): V1EChartsOption {
  const utilitySeries = comparison.series.map((series, index) => lineSeries(
    series.label,
    series.utilityValues,
    0,
    FISCAL_YEAR_COLORS[index % FISCAL_YEAR_COLORS.length]
  ));
  const costSeries = comparison.hasCost
    ? comparison.series.map((series, index) => lineSeries(
      series.label,
      series.costValues,
      1,
      FISCAL_YEAR_COLORS[index % FISCAL_YEAR_COLORS.length]
    ))
    : [];
  const xAxis = comparison.hasCost
    ? [
      monthAxis(comparison.monthLabels, 0, false),
      monthAxis(comparison.monthLabels, 1, true)
    ]
    : [monthAxis(comparison.monthLabels, 0, true)];
  const yAxis = comparison.hasCost
    ? [metricAxis(utilityMetric, 0), metricAxis(costMetric, 1)]
    : [metricAxis(utilityMetric, 0)];

  return {
    color: [...FISCAL_YEAR_COLORS],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: params => formatComparisonTooltip(params, utilityMetric, costMetric)
    },
    legend: {
      type: 'scroll',
      top: 0,
      left: 0,
      right: 0,
      data: comparison.series.map(series => series.label)
    },
    axisPointer: comparison.hasCost ? { link: [{ xAxisIndex: 'all' }] } : undefined,
    grid: comparison.hasCost
      ? [
        { top: 64, right: 28, bottom: '55%', left: 76, containLabel: false },
        { top: '57%', right: 28, bottom: 46, left: 76, containLabel: false }
      ]
      : [{ top: 64, right: 28, bottom: 46, left: 76, containLabel: false }],
    xAxis,
    yAxis,
    series: [...utilitySeries, ...costSeries]
  } as V1EChartsOption;
}

function lineSeries(
  name: string,
  values: readonly (number | null)[],
  axisIndex: number,
  color: string
): Record<string, unknown> {
  return {
    name,
    type: 'line',
    xAxisIndex: axisIndex,
    yAxisIndex: axisIndex,
    data: values,
    connectNulls: false,
    showSymbol: true,
    symbolSize: 7,
    emphasis: { focus: 'series' },
    itemStyle: { color },
    lineStyle: { color, width: 2.5 }
  };
}

function monthAxis(labels: readonly string[], gridIndex: number, showLabels: boolean): Record<string, unknown> {
  return {
    type: 'category',
    gridIndex,
    data: labels,
    boundaryGap: false,
    axisLabel: { show: showLabels },
    axisTick: { show: showLabels }
  };
}

function metricAxis(metric: MeterResultsChartMetric | undefined, gridIndex: number): Record<string, unknown> {
  return {
    type: 'value',
    gridIndex,
    name: metric ? metricLabel(metric) : '',
    nameLocation: 'middle',
    nameGap: 58,
    min: 0,
    axisLabel: metric?.currency
      ? { show: true, formatter: '${value}' }
      : { show: true }
  };
}

function metricValue(row: MonthlyData | undefined, metricId: string): number | null {
  if (!row) {
    return null;
  }
  const value = row[metricId as keyof MonthlyData];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metricLabel(metric: MeterResultsChartMetric): string {
  if (metric.currency) {
    return `${metric.label} (USD)`;
  }
  return metric.unit ? `${metric.label} (${metric.unit})` : metric.label;
}

function formatMetricValue(value: number | null, currency: boolean): string {
  if (value === null) {
    return 'No data';
  }
  return new Intl.NumberFormat('en-US', currency
    ? { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 1 }).format(value);
}

interface ComparisonTooltipParam {
  readonly axisIndex?: number;
  readonly axisValueLabel?: string;
  readonly marker?: string;
  readonly seriesName?: string;
  readonly value?: unknown;
  readonly xAxisIndex?: number;
}

function formatComparisonTooltip(
  params: unknown,
  utilityMetric: MeterResultsChartMetric | undefined,
  costMetric: MeterResultsChartMetric | undefined
): string {
  const items = (Array.isArray(params) ? params : [params]).filter(isTooltipParam);
  const header = items[0]?.axisValueLabel ? `<div>${escapeHtml(items[0].axisValueLabel)}</div>` : '';
  const rows = items.map(item => {
    const currency = (item.xAxisIndex === 1 || item.axisIndex === 1) && !!costMetric;
    const value = item.value === null || item.value === undefined
      ? Number.NaN
      : typeof item.value === 'number' ? item.value : Number(item.value);
    const valueLabel = Number.isFinite(value)
      ? formatMetricValue(value, currency || !!(!utilityMetric && costMetric?.currency))
      : 'No data';
    return `<div>${item.marker ?? ''}${escapeHtml(item.seriesName ?? '')}: ${escapeHtml(valueLabel)}</div>`;
  }).join('');
  return `${header}${rows}`;
}

function isTooltipParam(value: unknown): value is ComparisonTooltipParam {
  return typeof value === 'object' && value !== null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] ?? character);
}

function normalizeMonth(month: number): number {
  const normalized = Number.isFinite(month) ? Math.trunc(month) : 0;
  return ((normalized % 12) + 12) % 12;
}
