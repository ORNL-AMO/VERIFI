import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountOverviewComponent } from './account-overview.component';
import { AccountOverviewBannerComponent } from './account-overview-banner/account-overview-banner.component';
import { EnergyOverviewComponent } from './energy-overview/energy-overview.component';
import { CostsOverviewComponent } from './costs-overview/costs-overview.component';
import { EmissionsOverviewComponent } from './emissions-overview/emissions-overview.component';
import { RouterModule } from '@angular/router';
import { WaterOverviewComponent } from './water-overview/water-overview.component';
import { OtherUtilityOverviewComponent } from './other-utility-overview/other-utility-overview.component';
import { FacilityUtilityUsageTableComponent } from './energy-overview/facility-utility-usage-table/facility-utility-usage-table.component';
import { AccountUtilitySourceTableComponent } from './energy-overview/account-utility-source-table/account-utility-source-table.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { FacilityUtilityUsageChartComponent } from './energy-overview/facility-utility-usage-chart/facility-utility-usage-chart.component';
import { AccountUtilitySourceChartComponent } from './energy-overview/account-utility-source-chart/account-utility-source-chart.component';
import { EmissionsMapPlotComponent } from './emissions-overview/emissions-map-plot/emissions-map-plot.component';
import { UtilityUsageMapComponent } from './energy-overview/utility-usage-map/utility-usage-map.component';
import { FacilityCostTableComponent } from './costs-overview/facility-cost-table/facility-cost-table.component';
import { FacilityCostChartComponent } from './costs-overview/facility-cost-chart/facility-cost-chart.component';
import { UtilityCostChartComponent } from './costs-overview/utility-cost-chart/utility-cost-chart.component';
import { UtilityCostTableComponent } from './costs-overview/utility-cost-table/utility-cost-table.component';
import { FacilityCostsMapComponent } from './costs-overview/facility-costs-map/facility-costs-map.component';



@NgModule({
  declarations: [
    AccountOverviewComponent,
    AccountOverviewBannerComponent,
    EnergyOverviewComponent,
    CostsOverviewComponent,
    EmissionsOverviewComponent,
    WaterOverviewComponent,
    OtherUtilityOverviewComponent,
    FacilityUtilityUsageTableComponent,
    AccountUtilitySourceTableComponent,
    FacilityUtilityUsageChartComponent,
    AccountUtilitySourceChartComponent,
    EmissionsMapPlotComponent,
    UtilityUsageMapComponent,
    FacilityCostTableComponent,
    FacilityCostChartComponent,
    UtilityCostChartComponent,
    UtilityCostTableComponent,
    FacilityCostsMapComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule
  ]
})
export class AccountOverviewModule { }
