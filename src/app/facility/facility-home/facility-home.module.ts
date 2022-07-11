import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHomeComponent } from './facility-home.component';
import { FacilityHomeSummaryComponent } from './facility-home-summary/facility-home-summary.component';
import { RouterModule } from '@angular/router';
import { ScorecardStatusComponent } from './scorecard-status/scorecard-status.component';
import { MeterCardComponent } from './meter-card/meter-card.component';



@NgModule({
  declarations: [
    FacilityHomeComponent,
    FacilityHomeSummaryComponent,
    ScorecardStatusComponent,
    MeterCardComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class FacilityHomeModule { }
