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
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { MonthlyUsageChartComponent } from './energy-overview/monthly-usage-chart/monthly-usage-chart.component';
import { MonthlyCostsChartComponent } from './costs-overview/monthly-costs-chart/monthly-costs-chart.component';
import { MonthlyEmissionsChartComponent } from './emissions-overview/monthly-emissions-chart/monthly-emissions-chart.component';
import { MonthlyWaterChartComponent } from './water-overview/monthly-water-chart/monthly-water-chart.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';



@NgModule({
  declarations: [
    AccountOverviewComponent,
    AccountOverviewBannerComponent,
    EnergyOverviewComponent,
    CostsOverviewComponent,
    EmissionsOverviewComponent,
    WaterOverviewComponent,
    OtherUtilityOverviewComponent,
    MonthlyUsageChartComponent,
    MonthlyCostsChartComponent,
    MonthlyEmissionsChartComponent,
    MonthlyWaterChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    DataOverviewModule
  ]
})
export class AccountOverviewModule { }
