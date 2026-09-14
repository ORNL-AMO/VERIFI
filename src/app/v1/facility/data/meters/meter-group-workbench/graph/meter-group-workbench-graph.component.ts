import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  MeterGroupChartSeriesDisplay,
  MeterGroupResultsPeriod,
  formatMeterGroupPeriodLabel,
  meterGroupResultRowsForPeriod,
  meterGroupResultUtilityValue
} from '../../facility-meters.models';

@Component({
  selector: 'app-meter-group-workbench-graph',
  templateUrl: './meter-group-workbench-graph.component.html',
  styleUrls: ['./meter-group-workbench-graph.component.css'],
  standalone: false
})
export class MeterGroupWorkbenchGraphComponent {
  private readonly route = inject(ActivatedRoute);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly period = signal<MeterGroupResultsPeriod>(this.route.snapshot.data['meterGroupPeriod'] ?? 'monthly');
  readonly utilityDisplay = signal<MeterGroupChartSeriesDisplay>('bar');
  readonly costDisplay = signal<MeterGroupChartSeriesDisplay>('line');
  readonly results = this.workspace.selectedMeterGroupResults;
  readonly rows = computed(() => meterGroupResultRowsForPeriod(this.results(), this.period()));
  readonly hasChartSeries = computed(() => {
    const results = this.results();
    return (this.utilityDisplay() !== 'off' && (results.showEnergyUse || results.showConsumption))
      || (this.costDisplay() !== 'off' && results.showCost);
  });
  readonly chartOption = computed<V1EChartsOption>(() => {
    const results = this.results();
    const rows = this.rows();
    const series: Array<Record<string, unknown>> = [];
    const yAxis: Array<Record<string, unknown>> = [];
    const xData = rows.map(row => formatMeterGroupPeriodLabel(row, this.period()));

    if (this.utilityDisplay() !== 'off' && (results.showEnergyUse || results.showConsumption)) {
      yAxis.push({
        type: 'value',
        name: results.utilityUnit ? `${results.utilityLabel} (${results.utilityUnit})` : results.utilityLabel,
        min: 0
      });
      series.push({
        name: results.utilityLabel,
        type: this.utilityDisplay(),
        yAxisIndex: 0,
        data: rows.map(row => meterGroupResultUtilityValue(results, row)),
        smooth: this.utilityDisplay() === 'line',
        itemStyle: { color: 'var(--v1-chart-series-1)' },
        lineStyle: { color: 'var(--v1-chart-series-1)', width: 3 }
      });
    }

    if (this.costDisplay() !== 'off' && results.showCost) {
      yAxis.push({
        type: 'value',
        name: 'Total Cost',
        min: 0,
        axisLabel: { formatter: '${value}' }
      });
      series.push({
        name: 'Total Cost',
        type: this.costDisplay(),
        yAxisIndex: yAxis.length - 1,
        data: rows.map(row => row.energyCost),
        smooth: this.costDisplay() === 'line',
        itemStyle: { color: 'var(--v1-chart-series-3)' },
        lineStyle: { color: 'var(--v1-chart-series-3)', width: 3 }
      });
    }

    const alignedYAxis = alignDualYAxis(yAxis);

    return {
      tooltip: { trigger: 'axis', formatter: formatChartTooltip },
      legend: { top: 0, left: 'center', right: 112 },
      grid: { top: 72, right: alignedYAxis.length > 1 ? 56 : 18, bottom: 36, left: 54, containLabel: true },
      xAxis: { type: 'category', data: xData },
      yAxis: alignedYAxis.length > 0 ? alignedYAxis : [{ type: 'value', min: 0 }],
      series
    } as V1EChartsOption;
  });

  setUtilityDisplay(display: MeterGroupChartSeriesDisplay): void {
    this.utilityDisplay.set(display);
  }

  setCostDisplay(display: MeterGroupChartSeriesDisplay): void {
    this.costDisplay.set(display);
  }
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

function formatChartTooltipValue(value: unknown): string {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue)
    ? Math.round(numericValue).toLocaleString()
    : String(value ?? '');
}

function formatChartTooltipCostValue(value: unknown): string {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue)
    ? `$${Math.round(numericValue).toLocaleString()}`
    : String(value ?? '');
}

function formatChartTooltip(params: unknown): string {
  const tooltipParams = Array.isArray(params) ? params : [params];
  const firstParam = tooltipParams.find(isTooltipParam);
  const header = firstParam ? `<div>${escapeHtml(firstParam.axisValueLabel ?? firstParam.name ?? '')}</div>` : '';
  const rows = tooltipParams
    .filter(isTooltipParam)
    .map(param => {
      const value = param.seriesName === 'Total Cost'
        ? formatChartTooltipCostValue(param.value)
        : formatChartTooltipValue(param.value);
      return `<div>${param.marker ?? ''}${escapeHtml(param.seriesName ?? '')}: ${escapeHtml(value)}</div>`;
    })
    .join('');
  return `${header}${rows}`;
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
