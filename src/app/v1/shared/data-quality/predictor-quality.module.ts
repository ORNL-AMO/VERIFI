import { NgModule } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { PredictorQualityPresentationComponent } from './predictor-quality-presentation/predictor-quality-presentation.component';

@NgModule({ declarations: [PredictorQualityPresentationComponent], imports: [IconComponent, EChartsChartDirective],
  exports: [PredictorQualityPresentationComponent] })
export class PredictorQualityModule {}
