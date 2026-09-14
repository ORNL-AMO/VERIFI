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
  readonly costDisplay = signal<MeterGroupChartSeriesDisplay>('bar');
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
        itemStyle: { color: '#ff6000' },
        lineStyle: { color: '#ff6000', width: 3 }
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
        itemStyle: { color: '#2c386b' },
        lineStyle: { color: '#2c386b', width: 3 }
      });
    }

    return {
      color: ['#ff6000', '#2c386b'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { top: 48, right: yAxis.length > 1 ? 56 : 18, bottom: 36, left: 54, containLabel: true },
      xAxis: { type: 'category', data: xData },
      yAxis: yAxis.length > 0 ? yAxis : [{ type: 'value', min: 0 }],
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
