import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import {
  BillInspectionReport,
  escapeHtml,
  formatBillInspectionCurrency,
  formatBillInspectionShortDate,
  tooltipParamMarker,
  tooltipParamSeriesName,
  tooltipParamValue
} from '../meter-workbench-bill-inspection.models';

const TIME_SERIES_COLORS = [
  'var(--v1-chart-series-1)',
  'var(--v1-chart-series-2)',
  'var(--v1-chart-series-3)',
  'var(--v1-chart-series-4)',
  '#7a4db3',
  '#0f7895',
  '#c63d72',
  '#64720f',
  '#8f4b1b',
  '#4f6f52'
];

@Component({
  selector: 'app-bill-inspection-overview-chart',
  templateUrl: './bill-inspection-overview-chart.component.html',
  styleUrls: ['../meter-workbench-bill-inspection.component.css'],
  host: { role: 'region' },
  standalone: false
})
export class BillInspectionOverviewChartComponent implements OnChanges {
  @Input({ required: true }) report!: BillInspectionReport;
  @Input() meterName = '';

  option?: V1EChartsOption;

  @ViewChild('overviewChart', { static: false, read: EChartsChartDirective }) overviewChart?: EChartsChartDirective;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['report'] && this.report) {
      this.option = billInspectionTimeSeriesOption(this.report);
    }
  }

  downloadOverviewChart(): void {
    this.overviewChart?.downloadPng('meter-bill-inspection-charges');
  }
}

export function billInspectionTimeSeriesOption(report: BillInspectionReport): V1EChartsOption {
  const series: Array<Record<string, unknown>> = [];
  if (report.hasTotalCostData) {
    const color = timeSeriesColor(series.length);
    series.push({
      name: 'Total Cost',
      type: 'line',
      data: report.rows.map(row => [row.sortValue, row.totalCost ?? null]),
      showSymbol: true,
      symbolSize: 7,
      connectNulls: false,
      itemStyle: { color },
      lineStyle: { width: 3, color }
    });
  }
  report.charges.forEach(charge => {
    if (charge.amountCount === 0) {
      return;
    }
    const color = timeSeriesColor(series.length);
    series.push({
      name: charge.charge.name,
      type: 'line',
      data: report.rows.map(row => [row.sortValue, charge.valuesByReading[row.reading.guid]?.amount ?? null]),
      showSymbol: true,
      symbolSize: 7,
      connectNulls: false,
      itemStyle: { color },
      lineStyle: { width: 3, color }
    });
  });

  const hasZoom = report.rows.length > 2;
  return {
    tooltip: { trigger: 'axis', formatter: params => timeSeriesTooltip(params, report) },
    legend: { type: 'scroll', top: 0, left: 0, right: 92 },
    grid: { top: 64, right: 24, bottom: hasZoom ? 74 : 36, left: 64, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: value => formatBillInspectionShortDate(Number(value)) }
    },
    yAxis: {
      type: 'value',
      name: 'Cost ($)',
      min: 0,
      axisLabel: { formatter: (value: number) => formatBillInspectionCurrency(value) }
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

function timeSeriesColor(index: number): string {
  return TIME_SERIES_COLORS[index] ?? `hsl(${(index * 137.508) % 360} 62% 42%)`;
}

function timeSeriesTooltip(params: unknown, report: BillInspectionReport): string {
  const tooltipParams = Array.isArray(params) ? params : [params];
  const firstValue = tooltipParams.map(param => tooltipParamValue(param)).find(value => value !== undefined);
  if (!firstValue) {
    return '';
  }
  const [timestamp] = firstValue;
  const row = report.rows.find(candidate => candidate.sortValue === Number(timestamp));
  const header = `<div>${escapeHtml(row?.dateLabel ?? formatBillInspectionShortDate(Number(timestamp)))}</div>`;
  const rows = tooltipParams
    .map(param => timeSeriesTooltipRow(param))
    .filter((value): value is string => value !== undefined)
    .join('');
  return `${header}${rows}`;
}

function timeSeriesTooltipRow(param: unknown): string | undefined {
  const value = tooltipParamValue(param);
  const seriesName = tooltipParamSeriesName(param);
  const marker = tooltipParamMarker(param);
  if (!value || !seriesName) {
    return undefined;
  }
  return `<div>${marker}${escapeHtml(seriesName)}: ${escapeHtml(formatBillInspectionCurrency(value[1]))}</div>`;
}
