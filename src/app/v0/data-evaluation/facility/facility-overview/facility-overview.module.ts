import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityOverviewComponent } from '@v0/data-evaluation/facility/facility-overview/facility-overview.component';
import { FacilityEnergyOverviewComponent } from '@v0/data-evaluation/facility/facility-overview/facility-energy-overview/facility-energy-overview.component';
import { FacilityWaterOverviewComponent } from '@v0/data-evaluation/facility/facility-overview/facility-water-overview/facility-water-overview.component';
import { FacilityCostOverviewComponent } from '@v0/data-evaluation/facility/facility-overview/facility-cost-overview/facility-cost-overview.component';
import { FacilityEmissionsOverviewComponent } from '@v0/data-evaluation/facility/facility-overview/facility-emissions-overview/facility-emissions-overview.component';
import { FacilityOverviewBannerComponent } from '@v0/data-evaluation/facility/facility-overview/facility-overview-banner/facility-overview-banner.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from '@shared/calculating-spinner/calculating-spinner.module';
import { DataOverviewModule } from '@v0/shared/data-overview/data-overview.module';
import { FormsModule } from '@angular/forms';
import { FacilityOverviewOptions } from '@v0/data-evaluation/facility/facility-overview/facility-overview-banner/facility-overview-options/facility-overview-options';



@NgModule({
  declarations: [
    FacilityOverviewComponent,
    FacilityEnergyOverviewComponent,
    FacilityWaterOverviewComponent,
    FacilityCostOverviewComponent,
    FacilityEmissionsOverviewComponent,
    FacilityOverviewBannerComponent,
    FacilityOverviewOptions
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    DataOverviewModule,
    FormsModule
  ]
})
export class FacilityOverviewModule { }
