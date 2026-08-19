import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataOverviewMapComponent } from '@v0/shared/data-overview/data-overview-map/data-overview-map.component';
import { FacilityUsageDonutComponent } from '@v0/shared/data-overview/facility-usage-donut/facility-usage-donut.component';
import { FacilitiesUsageTableComponent } from '@v0/shared/data-overview/facilities-usage-table/facilities-usage-table.component';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
// import { AccountUtilityConsumptionTableComponent } from '@v0/shared/data-overview/account-utility-consumption-table/account-utility-consumption-table.component';
import { FacilitiesUsageStackedBarChartComponent } from '@v0/shared/data-overview/facilities-usage-stacked-bar-chart/facilities-usage-stacked-bar-chart.component';
import { MonthlyUtilityUsageLineChartComponent } from '@v0/shared/data-overview/monthly-utility-usage-line-chart/monthly-utility-usage-line-chart.component';
import { MetersOverviewStackedLineChartComponent } from '@v0/shared/data-overview/meters-overview-stacked-line-chart/meters-overview-stacked-line-chart.component';
import { MeterUsageDonutComponent } from '@v0/shared/data-overview/meter-usage-donut/meter-usage-donut.component';
import { MeterUsageTableComponent } from '@v0/shared/data-overview/meter-usage-table/meter-usage-table.component';
import { UtilityConsumptionTableComponent } from '@v0/shared/data-overview/utility-consumption-table/utility-consumption-table.component';
import { UtilitiesUsageChartComponent } from '@v0/shared/data-overview/utilities-usage-chart/utilities-usage-chart.component';
import { EnergyConsumptionTableComponent } from '@v0/shared/data-overview/utility-consumption-table/energy-consumption-table/energy-consumption-table.component';
import { EmissionsConsumptionTableComponent } from '@v0/shared/data-overview/utility-consumption-table/emissions-consumption-table/emissions-consumption-table.component';
import { CostsConsumptionTableComponent } from '@v0/shared/data-overview/utility-consumption-table/costs-consumption-table/costs-consumption-table.component';
import { WaterConsumptionTableComponent } from '@v0/shared/data-overview/utility-consumption-table/water-consumption-table/water-consumption-table.component';
import { EmissionsStackedLineChartComponent } from '@v0/shared/data-overview/emissions-stacked-line-chart/emissions-stacked-line-chart.component';
import { EmissionsDonutComponent } from '@v0/shared/data-overview/emissions-donut/emissions-donut.component';
import { EmissionsUsageTableComponent } from '@v0/shared/data-overview/emissions-usage-table/emissions-usage-table.component';
import { EmissionsUsageChartComponent } from '@v0/shared/data-overview/emissions-usage-chart/emissions-usage-chart.component';
import { FacilitiesEmissionsStackedBarChartComponent } from '@v0/shared/data-overview/facilities-emissions-stacked-bar-chart/facilities-emissions-stacked-bar-chart.component';
import { AccountUtilityUsageTableComponent } from '@v0/shared/data-overview/account-utility-usage-table/account-utility-usage-table.component';
import { AccountUtilityUsageDonutComponent } from '@v0/shared/data-overview/account-utility-usage-donut/account-utility-usage-donut.component';
import { AccountWaterUsageTableComponent } from '@v0/shared/data-overview/account-water-usage-table/account-water-usage-table.component';
import { AccountWaterUsageDonutComponent } from '@v0/shared/data-overview/account-water-usage-donut/account-water-usage-donut.component';
import { AccountWaterStackedBarChartComponent } from '@v0/shared/data-overview/account-water-stacked-bar-chart/account-water-stacked-bar-chart.component';
import { FacilitySectionReportComponent } from '@v0/shared/data-overview/facility-section-report/facility-section-report.component';



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
    EmissionsDonutComponent,
    EmissionsUsageTableComponent,
    EmissionsUsageChartComponent,
    FacilitiesEmissionsStackedBarChartComponent,
    AccountUtilityUsageTableComponent,
    AccountUtilityUsageDonutComponent,
    AccountWaterUsageTableComponent,
    AccountWaterUsageDonutComponent,
    AccountWaterStackedBarChartComponent,
    FacilitySectionReportComponent
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
    EmissionsDonutComponent,
    EmissionsUsageTableComponent,
    EmissionsUsageChartComponent,
    FacilitiesEmissionsStackedBarChartComponent,
    AccountUtilityUsageTableComponent,
    AccountUtilityUsageDonutComponent,
    AccountWaterUsageTableComponent,
    AccountWaterUsageDonutComponent,
    AccountWaterStackedBarChartComponent,
    FacilitySectionReportComponent
  ]
})
export class DataOverviewModule { }
