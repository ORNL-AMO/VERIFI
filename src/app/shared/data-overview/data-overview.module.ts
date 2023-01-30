import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataOverviewMapComponent } from './data-overview-map/data-overview-map.component';
import { FacilityUsageDonutComponent } from './facility-usage-donut/facility-usage-donut.component';
import { FacilitiesUsageTableComponent } from './facilities-usage-table/facilities-usage-table.component';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';
import { AccountUtilityConsumptionTableComponent } from './account-utility-consumption-table/account-utility-consumption-table.component';
import { FacilitiesUsageStackedBarChartComponent } from './facilities-usage-stacked-bar-chart/facilities-usage-stacked-bar-chart.component';
import { MonthlyUtilityUsageLineChartComponent } from './monthly-utility-usage-line-chart/monthly-utility-usage-line-chart.component';
import { MetersOverviewStackedLineChartComponent } from './meters-overview-stacked-line-chart/meters-overview-stacked-line-chart.component';
import { MeterUsageDonutComponent } from './meter-usage-donut/meter-usage-donut.component';



@NgModule({
  declarations: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent,
    FacilitiesUsageTableComponent,
    AccountUtilityConsumptionTableComponent,
    FacilitiesUsageStackedBarChartComponent,
    MonthlyUtilityUsageLineChartComponent,
    MetersOverviewStackedLineChartComponent,
    MeterUsageDonutComponent
  ],
  imports: [
    CommonModule,
    HelperPipesModule
  ],
  exports: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent,
    FacilitiesUsageTableComponent,
    AccountUtilityConsumptionTableComponent,
    FacilitiesUsageStackedBarChartComponent,
    MonthlyUtilityUsageLineChartComponent,
    MetersOverviewStackedLineChartComponent,
    MeterUsageDonutComponent
  ]
})
export class DataOverviewModule { }
