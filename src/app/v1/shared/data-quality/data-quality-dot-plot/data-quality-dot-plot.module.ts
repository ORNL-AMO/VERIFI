import { NgModule } from '@angular/core';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataQualityDotPlotComponent } from './data-quality-dot-plot.component';

@NgModule({
  declarations: [DataQualityDotPlotComponent],
  imports: [EChartsChartDirective, IconComponent],
  exports: [DataQualityDotPlotComponent]
})
export class DataQualityDotPlotModule {}
