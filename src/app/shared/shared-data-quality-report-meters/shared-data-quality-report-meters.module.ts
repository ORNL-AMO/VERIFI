import { NgModule } from "@angular/core";
import { MeterEnergyTimeseriesGraphComponent } from "./meter-energy-timeseries-graph/meter-energy-timeseries-graph.component";
import { MeterCostTimeseriesGraphComponent } from './meter-cost-timeseries-graph/meter-cost-timeseries-graph.component';
import { MeterStatisticsTableComponent } from './meter-statistics-table/meter-statistics-table.component';
import { CommonModule } from "@angular/common";
import { HelperPipesModule } from "../helper-pipes/_helper-pipes.module";
import { MeterCostHistogramComponent } from './meter-cost-histogram/meter-cost-histogram.component';
import { MeterEnergyHistogramComponent } from './meter-energy-histogram/meter-energy-histogram.component';

@NgModule({
  declarations: [
    MeterEnergyTimeseriesGraphComponent,
    MeterCostTimeseriesGraphComponent,
    MeterStatisticsTableComponent,
    MeterCostHistogramComponent,
    MeterEnergyHistogramComponent,
  ],
  imports: [
    CommonModule,
    HelperPipesModule
],
  exports: [
    MeterEnergyTimeseriesGraphComponent,
    MeterCostTimeseriesGraphComponent,
    MeterStatisticsTableComponent,
    MeterCostHistogramComponent,
    MeterEnergyHistogramComponent,
  ]
})
export class SharedDataQualityReportMetersModule { }
