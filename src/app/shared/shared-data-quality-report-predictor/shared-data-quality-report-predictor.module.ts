import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HelperPipesModule } from "../helper-pipes/_helper-pipes.module";
import { PredictorTimeseriesGraphComponent } from "./predictor-timeseries-graph/predictor-timeseries-graph.component";
import { PredictorHistogramGraphComponent } from "./predictor-histogram-graph/predictor-histogram-graph.component";
import { PredictorStatisticsTableComponent } from "./predictor-statistics-table/predictor-statistics-table.component";
import { FormsModule } from "@angular/forms";
import { PredictorDataQualityReportComponent } from "./predictor-data-quality-report/predictor-data-quality-report.component";
import { PredictorDataQualityReportModalComponent } from "./predictor-data-quality-report-modal/predictor-data-quality-report-modal.component";
import { PredictorDataQualityStatusPipe } from './predictor-data-quality-status.pipe';

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
    PredictorDataQualityStatusPipe
  ]
})
export class SharedDataQualityReportPredictorsModule { }
