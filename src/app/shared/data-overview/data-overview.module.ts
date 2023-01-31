import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataOverviewMapComponent } from './data-overview-map/data-overview-map.component';
import { FacilityUsageDonutComponent } from './facility-usage-donut/facility-usage-donut.component';
import { FacilitiesUsageTableComponent } from './facilities-usage-table/facilities-usage-table.component';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';
// import { AccountUtilityConsumptionTableComponent } from './account-utility-consumption-table/account-utility-consumption-table.component';
import { FacilitiesUsageStackedBarChartComponent } from './facilities-usage-stacked-bar-chart/facilities-usage-stacked-bar-chart.component';
import { MonthlyUtilityUsageLineChartComponent } from './monthly-utility-usage-line-chart/monthly-utility-usage-line-chart.component';
import { MetersOverviewStackedLineChartComponent } from './meters-overview-stacked-line-chart/meters-overview-stacked-line-chart.component';
import { MeterUsageDonutComponent } from './meter-usage-donut/meter-usage-donut.component';
import { MeterUsageTableComponent } from './meter-usage-table/meter-usage-table.component';
import { UtilityConsumptionTableComponent } from './utility-consumption-table/utility-consumption-table.component';
import { UtilitiesUsageChartComponent } from './utilities-usage-chart/utilities-usage-chart.component';



@NgModule({
  declarations: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent,
    FacilitiesUsageTableComponent,
    FacilitiesUsageStackedBarChartComponent,
    MonthlyUtilityUsageLineChartComponent,
    MetersOverviewStackedLineChartComponent,
    MeterUsageDonutComponent,
    MeterUsageTableComponent,
    UtilityConsumptionTableComponent,
    UtilitiesUsageChartComponent
  ],
  imports: [
    CommonModule,
    HelperPipesModule
  ],
  exports: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent,
    FacilitiesUsageTableComponent,
    FacilitiesUsageStackedBarChartComponent,
    MonthlyUtilityUsageLineChartComponent,
    MetersOverviewStackedLineChartComponent,
    MeterUsageDonutComponent,
    MeterUsageTableComponent,
    UtilityConsumptionTableComponent,
    UtilitiesUsageChartComponent
  ]
})
export class DataOverviewModule { }
