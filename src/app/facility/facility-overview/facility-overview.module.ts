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
import { EnergyMetersOverviewTableComponent } from './facility-energy-overview/energy-meters-overview-table/energy-meters-overview-table.component';
import { EnergyMetersOverviewChartComponent } from './facility-energy-overview/energy-meters-overview-chart/energy-meters-overview-chart.component';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { EnergyMetersUsageChartComponent } from './facility-energy-overview/energy-meters-usage-chart/energy-meters-usage-chart.component';
import { EnergyUtilitiesUsageTableComponent } from './facility-energy-overview/energy-utilities-usage-table/energy-utilities-usage-table.component';
import { EnergyUtilitiesUsageChartComponent } from './facility-energy-overview/energy-utilities-usage-chart/energy-utilities-usage-chart.component';



@NgModule({
  declarations: [
    FacilityOverviewComponent,
    FacilityEnergyOverviewComponent,
    FacilityWaterOverviewComponent,
    FacilityCostOverviewComponent,
    FacilityEmissionsOverviewComponent,
    FacilityOverviewBannerComponent,
    EnergyMetersOverviewTableComponent,
    EnergyMetersOverviewChartComponent,
    EnergyMetersUsageChartComponent,
    EnergyUtilitiesUsageTableComponent,
    EnergyUtilitiesUsageChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule
  ]
})
export class FacilityOverviewModule { }
