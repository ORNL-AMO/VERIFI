import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityOverviewComponent } from './facility-overview.component';
import { FacilityEnergyOverviewComponent } from './facility-energy-overview/facility-energy-overview.component';
import { FacilityWaterOverviewComponent } from './facility-water-overview/facility-water-overview.component';
import { FacilityCostOverviewComponent } from './facility-cost-overview/facility-cost-overview.component';
import { FacilityEmissionsOverviewComponent } from './facility-emissions-overview/facility-emissions-overview.component';
import { FacilityOverviewBannerComponent } from './facility-overview-banner/facility-overview-banner.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { FacilityEnergyMonthlyChartComponent } from './facility-energy-overview/facility-energy-monthly-chart/facility-energy-monthly-chart.component';
import { FacilityCostMonthlyChartComponent } from './facility-cost-overview/facility-cost-monthly-chart/facility-cost-monthly-chart.component';
import { FacilityEmissionsMonthlyChartComponent } from './facility-emissions-overview/facility-emissions-monthly-chart/facility-emissions-monthly-chart.component';
import { FacilityWaterMonthlyChartComponent } from './facility-water-overview/facility-water-monthly-chart/facility-water-monthly-chart.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';



@NgModule({
  declarations: [
    FacilityOverviewComponent,
    FacilityEnergyOverviewComponent,
    FacilityWaterOverviewComponent,
    FacilityCostOverviewComponent,
    FacilityEmissionsOverviewComponent,
    FacilityOverviewBannerComponent,
    FacilityEnergyMonthlyChartComponent,
    FacilityCostMonthlyChartComponent,
    FacilityEmissionsMonthlyChartComponent,
    FacilityWaterMonthlyChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    DataOverviewModule
  ]
})
export class FacilityOverviewModule { }
