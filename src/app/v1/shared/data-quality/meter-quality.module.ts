import { NgModule } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterQualityPresentationComponent } from './meter-quality-presentation/meter-quality-presentation.component';

@NgModule({ declarations: [MeterQualityPresentationComponent], imports: [IconComponent, EChartsChartDirective],
  exports: [MeterQualityPresentationComponent] })
export class MeterQualityModule {}
