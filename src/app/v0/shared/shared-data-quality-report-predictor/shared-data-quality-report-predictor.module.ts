import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HelperPipesModule } from "@v0/shared/helper-pipes/_helper-pipes.module";
import { PredictorTimeseriesGraphComponent } from "@v0/shared/shared-data-quality-report-predictor/predictor-timeseries-graph/predictor-timeseries-graph.component";
import { PredictorHistogramGraphComponent } from "@v0/shared/shared-data-quality-report-predictor/predictor-histogram-graph/predictor-histogram-graph.component";
import { PredictorStatisticsTableComponent } from "@v0/shared/shared-data-quality-report-predictor/predictor-statistics-table/predictor-statistics-table.component";
import { FormsModule } from "@angular/forms";
import { PredictorDataQualityReportComponent } from "@v0/shared/shared-data-quality-report-predictor/predictor-data-quality-report/predictor-data-quality-report.component";
import { PredictorDataQualityReportModalComponent } from "@v0/shared/shared-data-quality-report-predictor/predictor-data-quality-report-modal/predictor-data-quality-report-modal.component";
import { PredictorDataQualityStatusPipe } from '@v0/shared/shared-data-quality-report-predictor/predictor-data-quality-status.pipe';

@NgModule({
  declarations: [
    PredictorTimeseriesGraphComponent,
    PredictorHistogramGraphComponent,
    PredictorStatisticsTableComponent,
    PredictorDataQualityReportComponent,
    PredictorDataQualityReportModalComponent,
    PredictorDataQualityStatusPipe
  ],
  imports: [
    CommonModule,
    HelperPipesModule,
    FormsModule
],
  exports: [
    PredictorDataQualityReportComponent,
    PredictorDataQualityReportModalComponent,
    PredictorDataQualityStatusPipe,
    PredictorTimeseriesGraphComponent,
    PredictorHistogramGraphComponent,
    PredictorStatisticsTableComponent
  ]
})
export class SharedDataQualityReportPredictorsModule { }
