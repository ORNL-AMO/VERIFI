import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHomeComponent } from './facility-home.component';
import { FacilityHomeSummaryComponent } from './facility-home-summary/facility-home-summary.component';
import { RouterModule } from '@angular/router';
import { ScorecardStatusComponent } from './scorecard-status/scorecard-status.component';
import { MeterCardComponent } from './meter-card/meter-card.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { FacilityEnergyReductionGoalComponent } from './facility-home-summary/facility-energy-reduction-goal/facility-energy-reduction-goal.component';
import { FacilityWaterReductionGoalComponent } from './facility-home-summary/facility-water-reduction-goal/facility-water-reduction-goal.component';



@NgModule({
  declarations: [
    FacilityHomeComponent,
    FacilityHomeSummaryComponent,
    ScorecardStatusComponent,
    MeterCardComponent,
    FacilityEnergyReductionGoalComponent,
    FacilityWaterReductionGoalComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule
  ]
})
export class FacilityHomeModule { }
