import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityComponent } from './facility.component';
import { FacilityDashboardComponent } from './facility-dashboard/facility-dashboard.component';
import { FacilityBannerComponent } from './facility-banner/facility-banner.component';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    FacilityComponent,
    FacilityDashboardComponent,
    FacilityBannerComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class FacilityModule { }
