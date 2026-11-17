import { Component, ViewChild, computed, input } from '@angular/core';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { DataQualityDotPlotInput, dataQualityDotPlotView } from './data-quality-dot-plot.view';

@Component({
  selector: 'app-data-quality-dot-plot', standalone: false,
  templateUrl: './data-quality-dot-plot.component.html',
  styleUrls: ['./data-quality-dot-plot.component.css']
})
export class DataQualityDotPlotComponent {
  readonly data = input.required<DataQualityDotPlotInput>();
  readonly idPrefix = input.required<string>();
  readonly heading = input.required<string>();
  readonly headingLevel = input(2);
  readonly chartFileName = input('data-quality-dot-plot');
  readonly view = computed(() => dataQualityDotPlotView(this.data()));
  @ViewChild('chart', { read: EChartsChartDirective }) private chart?: EChartsChartDirective;
  downloadChart(): void { this.chart?.downloadPng(this.chartFileName()); }
}
