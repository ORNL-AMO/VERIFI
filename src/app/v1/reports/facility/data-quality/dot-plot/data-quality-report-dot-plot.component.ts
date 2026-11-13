import { Component, ViewChild, computed, input } from '@angular/core';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { DataQualityDotPlotInput, dataQualityDotPlotView } from './data-quality-report-dot-plot.view';

@Component({
  selector: 'app-data-quality-report-dot-plot', standalone: false,
  templateUrl: './data-quality-report-dot-plot.component.html',
  styleUrls: ['./data-quality-report-dot-plot.component.css']
})
export class DataQualityReportDotPlotComponent {
  readonly data = input.required<DataQualityDotPlotInput>();
  readonly idPrefix = input.required<string>();
  readonly heading = input.required<string>();
  readonly chartFileName = input('data-quality-dot-plot');
  readonly view = computed(() => dataQualityDotPlotView(this.data()));
  @ViewChild('chart', { read: EChartsChartDirective }) private chart?: EChartsChartDirective;
  downloadChart(): void { this.chart?.downloadPng(this.chartFileName()); }
}
