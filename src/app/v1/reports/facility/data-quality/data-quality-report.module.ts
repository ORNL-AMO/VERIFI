import { NgModule } from '@angular/core';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/analysis/facility/details/analysis-details-slideout.component';
import { MeterQualityModule } from '@app/v1/shared/data-quality/meter-quality.module';
import { PredictorQualityModule } from '@app/v1/shared/data-quality/predictor-quality.module';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataQualityReportPreviewComponent } from './preview/data-quality-report-preview.component';
import { DataQualityReportSetupComponent } from './setup/data-quality-report-setup.component';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { DataQualityAnnualTotalsComponent } from './annual-totals/data-quality-annual-totals.component';
import { DataQualityReportDotPlotComponent } from './dot-plot/data-quality-report-dot-plot.component';

@NgModule({ declarations: [DataQualityReportPreviewComponent, DataQualityReportSetupComponent,
    DataQualityAnnualTotalsComponent, DataQualityReportDotPlotComponent],
  imports: [ReactiveFormsModule, ReportsSharedModule, IconComponent, MeterQualityModule, PredictorQualityModule, EChartsChartDirective, AnalysisDetailsSlideoutComponent] })
export class DataQualityReportModule {}
