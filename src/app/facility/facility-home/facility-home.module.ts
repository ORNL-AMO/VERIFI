import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHomeComponent } from './facility-home.component';
import { FacilityHomeSummaryComponent } from './facility-home-summary/facility-home-summary.component';
import { RouterModule } from '@angular/router';
import { ScorecardStatusComponent } from './scorecard-status/scorecard-status.component';



@NgModule({
  declarations: [
    FacilityHomeComponent,
    FacilityHomeSummaryComponent,
    ScorecardStatusComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class FacilityHomeModule { }
