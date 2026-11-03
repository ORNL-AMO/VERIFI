import { NgModule } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { AnalysisResultChartsComponent } from '../result-charts/analysis-result-charts.component';
import { AnalysisModelComparisonChartComponent } from '../model-comparison-chart/analysis-model-comparison-chart.component';

@NgModule({ declarations: [AnalysisResultChartsComponent, AnalysisModelComparisonChartComponent], imports: [MeterResultsChartComponent, EChartsChartDirective],
  exports: [AnalysisResultChartsComponent, AnalysisModelComparisonChartComponent] })
export class AnalysisChartsModule { }
