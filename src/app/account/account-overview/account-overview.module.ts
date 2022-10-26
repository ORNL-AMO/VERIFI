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
    AccountUtilitySourceChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule
  ]
})
export class AccountOverviewModule { }
