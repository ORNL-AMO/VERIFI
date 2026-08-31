import { NgModule } from "@angular/core";
import { MeterEnergyTimeseriesGraphComponent } from "@v0/shared/shared-data-quality-report-meters/meter-energy-timeseries-graph/meter-energy-timeseries-graph.component";
import { MeterCostTimeseriesGraphComponent } from '@v0/shared/shared-data-quality-report-meters/meter-cost-timeseries-graph/meter-cost-timeseries-graph.component';
import { MeterStatisticsTableComponent } from '@v0/shared/shared-data-quality-report-meters/meter-statistics-table/meter-statistics-table.component';
import { CommonModule } from "@angular/common";
import { HelperPipesModule } from "@v0/shared/helper-pipes/_helper-pipes.module";
import { MeterCostHistogramComponent } from '@v0/shared/shared-data-quality-report-meters/meter-cost-histogram/meter-cost-histogram.component';
import { MeterEnergyHistogramComponent } from '@v0/shared/shared-data-quality-report-meters/meter-energy-histogram/meter-energy-histogram.component';
import { FormsModule } from '@angular/forms';
import { MeterDataQualityReportComponent } from '@v0/shared/shared-data-quality-report-meters/meter-data-quality-report/meter-data-quality-report.component';
import { MeterDataQualityReportModalComponent } from '@v0/shared/shared-data-quality-report-meters/meter-data-quality-report-modal/meter-data-quality-report-modal.component';
import { MeterDataQualityStatusPipe } from '@v0/shared/shared-data-quality-report-meters/meter-data-quality-status.pipe';
import { MeterAnnualTotalTableModule } from "@v0/shared/shared-meter-content/shared-meter-calendarization/meter-annual-total-table/meter-annual-total-table.module";


@NgModule({
  declarations: [
    MeterEnergyTimeseriesGraphComponent,
    MeterCostTimeseriesGraphComponent,
    MeterStatisticsTableComponent,
    MeterCostHistogramComponent,
    MeterEnergyHistogramComponent,
    MeterDataQualityReportComponent,
    MeterDataQualityReportModalComponent,
    MeterDataQualityStatusPipe,
  ],
  imports: [
    CommonModule,
    HelperPipesModule,
    FormsModule,
    MeterAnnualTotalTableModule
],
  exports: [
    MeterDataQualityReportModalComponent,
    MeterDataQualityReportComponent,
    MeterDataQualityStatusPipe,
    MeterStatisticsTableComponent,
    MeterCostTimeseriesGraphComponent,
    MeterEnergyTimeseriesGraphComponent,
    MeterCostHistogramComponent,
    MeterEnergyHistogramComponent
  ]
})
export class SharedDataQualityReportMetersModule { }
