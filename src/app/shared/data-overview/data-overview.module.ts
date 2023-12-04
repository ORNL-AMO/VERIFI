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
import { EnergyConsumptionTableComponent } from './utility-consumption-table/energy-consumption-table/energy-consumption-table.component';
import { EmissionsConsumptionTableComponent } from './utility-consumption-table/emissions-consumption-table/emissions-consumption-table.component';
import { CostsConsumptionTableComponent } from './utility-consumption-table/costs-consumption-table/costs-consumption-table.component';
import { WaterConsumptionTableComponent } from './utility-consumption-table/water-consumption-table/water-consumption-table.component';
import { EmissionsStackedLineChartComponent } from './emissions-stacked-line-chart/emissions-stacked-line-chart.component';
import { EmissionsDonutComponent } from './emissions-donut/emissions-donut.component';



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
    UtilitiesUsageChartComponent,
    EnergyConsumptionTableComponent,
    EmissionsConsumptionTableComponent,
    CostsConsumptionTableComponent,
    WaterConsumptionTableComponent,
    EmissionsStackedLineChartComponent,
    EmissionsDonutComponent
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
    UtilitiesUsageChartComponent,
    EmissionsStackedLineChartComponent,
    EmissionsDonutComponent
  ]
})
export class DataOverviewModule { }
