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



@NgModule({
  declarations: [
    FacilityOverviewComponent,
    FacilityEnergyOverviewComponent,
    FacilityWaterOverviewComponent,
    FacilityCostOverviewComponent,
    FacilityEmissionsOverviewComponent,
    FacilityOverviewBannerComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule
  ]
})
export class FacilityOverviewModule { }
