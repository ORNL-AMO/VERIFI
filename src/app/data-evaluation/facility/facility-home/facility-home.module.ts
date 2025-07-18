import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHomeComponent } from './facility-home.component';
import { FacilityHomeSummaryComponent } from './facility-home-summary/facility-home-summary.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { FacilityEnergyReductionGoalComponent } from './facility-energy-card/facility-energy-reduction-goal/facility-energy-reduction-goal.component';
import { FacilityWaterReductionGoalComponent } from './facility-water-card/facility-water-reduction-goal/facility-water-reduction-goal.component';
import { FacilityEnergyCardComponent } from './facility-energy-card/facility-energy-card.component';
import { FacilityWaterCardComponent } from './facility-water-card/facility-water-card.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';



@NgModule({
  declarations: [
    FacilityHomeComponent,
    FacilityHomeSummaryComponent,
    FacilityEnergyReductionGoalComponent,
    FacilityWaterReductionGoalComponent,
    FacilityEnergyCardComponent,
    FacilityWaterCardComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    DataOverviewModule
  ]
})
export class FacilityHomeModule { }
