import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HelperPipesModule } from "../helper-pipes/_helper-pipes.module";
import { PredictorTimeseriesGraphComponent } from "./predictor-timeseries-graph/predictor-timeseries-graph.component";
import { PredictorHistogramGraphComponent } from "./predictor-histogram-graph/predictor-histogram-graph.component";
import { PredictorStatisticsTableComponent } from "./predictor-statistics-table/predictor-statistics-table.component";

@NgModule({
  declarations: [
    PredictorTimeseriesGraphComponent,
    PredictorHistogramGraphComponent,
    PredictorStatisticsTableComponent
  ],
  imports: [
    CommonModule,
    HelperPipesModule
],
  exports: [
    PredictorTimeseriesGraphComponent,
    PredictorHistogramGraphComponent,
    PredictorStatisticsTableComponent
  ]
})
export class SharedDataQualityReportPredictorsModule { }
