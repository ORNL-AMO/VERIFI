import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterCharge } from '@data/models/idbModels/utilityMeter';
import {
  BillInspectionChargeView,
  BillInspectionCorrelationPlot,
  escapeHtml,
  formatBillInspectionCurrency,
  formatBillInspectionValue,
  tooltipParamData,
  tooltipParamName,
  tooltipParamValue
} from '../meter-workbench-bill-inspection.models';

export interface BillInspectionAxisBounds {
  readonly min: number;
  readonly max: number;
}

@Component({
  selector: 'app-bill-inspection-correlation-chart',
  templateUrl: './bill-inspection-correlation-chart.component.html',
  styleUrls: ['../meter-workbench-bill-inspection.component.css'],
  standalone: false
})
export class BillInspectionCorrelationChartComponent implements OnChanges {
  @Input({ required: true }) chargeView!: BillInspectionChargeView;
  @Input({ required: true }) plot!: BillInspectionCorrelationPlot;

  option?: V1EChartsOption;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['chargeView'] || changes['plot']) && this.chargeView && this.plot) {
      this.option = billInspectionCorrelationOption(this.chargeView.charge, this.plot);
    }
  }
}

export function billInspectionCorrelationOption(
  charge: MeterCharge,
  plot: BillInspectionCorrelationPlot
): V1EChartsOption {
  const xBounds = billInspectionAxisBounds([
    ...plot.points.map(point => point.x),
    ...(plot.regression?.lineData.map(point => point[0]) ?? [])
  ]);
  const yBounds = billInspectionAxisBounds([
    ...plot.points.map(point => point.y),
    ...(plot.regression?.lineData.map(point => point[1]) ?? [])
  ]);

  return {
    tooltip: { trigger: 'item', formatter: params => correlationTooltip(params, charge, plot) },
    legend: { top: 0, left: 'center' },
    grid: { top: 52, right: 24, bottom: 48, left: 64, containLabel: true },
    xAxis: {
      type: 'value',
      name: plot.xLabel,
      nameLocation: 'middle',
      nameGap: 32,
      min: xBounds?.min,
      max: xBounds?.max,
      splitNumber: 4,
      axisLabel: {
        hideOverlap: true,
        margin: 10,
        formatter: (value: number) => formatCompactAxisValue(value, plot.xCurrency)
      }
    },
    yAxis: {
      type: 'value',
      name: `${charge.name} ($)`,
      min: yBounds?.min,
      max: yBounds?.max,
      axisLabel: { formatter: (value: number) => formatBillInspectionCurrency(value) }
    },
    series: [
      {
        name: charge.name,
        type: 'scatter',
        data: plot.points.map(point => ({
          name: point.dateLabel,
          value: [point.x, point.y],
          xLabel: point.xLabel,
          yLabel: point.yLabel,
          chargeUsage: point.chargeUsage,
          chargeUsageLabel: point.chargeUsageLabel,
          demandKind: point.demandKind
        })),
        symbolSize: 10,
        itemStyle: { color: 'var(--v1-chart-series-1)', borderColor: '#ffffff', borderWidth: 2 },
        z: 2
      },
      ...(plot.regression
        ? [{
          name: 'Best fit',
          type: 'line',
          data: plot.regression.lineData,
          showSymbol: false,
          tooltip: { show: false },
          lineStyle: { color: 'var(--v1-chart-series-3)', width: 3 },
          z: 4
        }]
        : [])
    ]
  } as V1EChartsOption;
}

export function billInspectionAxisBounds(values: readonly (number | undefined)[]): BillInspectionAxisBounds | undefined {
  const finiteValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finiteValues.length === 0) {
    return undefined;
  }

  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const range = rawMax - rawMin;
  const padding = range > 0 ? range * 0.08 : Math.max(Math.abs(rawMin) * 0.08, 1);
  const min = rawMin >= 0 && rawMin - padding < 0 ? 0 : rawMin - padding;
  const max = rawMax + padding;

  return { min, max };
}

function formatCompactAxisValue(value: number, currency: boolean): string {
  return new Intl.NumberFormat('en-US', {
    ...(currency ? { style: 'currency', currency: 'USD' } : {}),
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: currency ? 0 : 1
  }).format(value);
}

function correlationTooltip(
  param: unknown,
  charge: MeterCharge,
  plot: BillInspectionCorrelationPlot
): string {
  const value = tooltipParamValue(param);
  const point = tooltipParamData(param);
  if (!value) {
    return '';
  }
  const usageLabel = typeof point?.['chargeUsageLabel'] === 'string' && point['chargeUsageLabel'] !== '-'
    ? `<div>Charge usage: ${escapeHtml(point['chargeUsageLabel'])}</div>`
    : '';
  const demandKindLabel = typeof point?.['demandKind'] === 'string'
    ? `<div>Demand basis: ${escapeHtml(point['demandKind'])}</div>`
    : '';
  const xLabel = typeof point?.['xLabel'] === 'string'
    ? point['xLabel']
    : formatBillInspectionValue(value[0], plot.xCurrency, plot.xUnit);
  const yLabel = typeof point?.['yLabel'] === 'string'
    ? point['yLabel']
    : formatBillInspectionCurrency(value[1]);
  return [
    `<div>${escapeHtml(tooltipParamName(param) || '')}</div>`,
    `<div>${escapeHtml(plot.xLabel)}: ${escapeHtml(xLabel)}</div>`,
    `<div>${escapeHtml(charge.name)}: ${escapeHtml(yLabel)}</div>`,
    usageLabel,
    demandKindLabel
  ].join('');
}
