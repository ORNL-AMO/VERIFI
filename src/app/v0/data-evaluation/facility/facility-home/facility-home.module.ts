import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHomeComponent } from '@v0/data-evaluation/facility/facility-home/facility-home.component';
import { FacilityHomeSummaryComponent } from '@v0/data-evaluation/facility/facility-home/facility-home-summary/facility-home-summary.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '@app/shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from '@app/shared/calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from '@app/shared/shared-analysis/shared-analysis.module';
import { FacilityEnergyReductionGoalComponent } from '@v0/data-evaluation/facility/facility-home/facility-energy-card/facility-energy-reduction-goal/facility-energy-reduction-goal.component';
import { FacilityWaterReductionGoalComponent } from '@v0/data-evaluation/facility/facility-home/facility-water-card/facility-water-reduction-goal/facility-water-reduction-goal.component';
import { FacilityEnergyCardComponent } from '@v0/data-evaluation/facility/facility-home/facility-energy-card/facility-energy-card.component';
import { FacilityWaterCardComponent } from '@v0/data-evaluation/facility/facility-home/facility-water-card/facility-water-card.component';
import { DataOverviewModule } from '@app/shared/data-overview/data-overview.module';
import { FormsModule } from '@angular/forms';
import { FacilityStatusCheckComponent } from '@v0/data-evaluation/facility/facility-home/facility-status-check/facility-status-check.component';
import { AnalysisStatusCheckComponent } from '@v0/data-evaluation/facility/facility-home/facility-status-check/analysis-status-check/analysis-status-check.component';
import { MetersStatusCheckComponent } from '@v0/data-evaluation/facility/facility-home/facility-status-check/meters-status-check/meters-status-check.component';
import { PredictorsStatusCheckComponent } from '@v0/data-evaluation/facility/facility-home/facility-status-check/predictors-status-check/predictors-status-check.component';



@NgModule({
  declarations: [
    FacilityHomeComponent,
    FacilityHomeSummaryComponent,
    FacilityEnergyReductionGoalComponent,
    FacilityWaterReductionGoalComponent,
    FacilityEnergyCardComponent,
    FacilityWaterCardComponent,
    FacilityStatusCheckComponent,
    AnalysisStatusCheckComponent,
    MetersStatusCheckComponent,
    PredictorsStatusCheckComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    DataOverviewModule,
    FormsModule
  ]
})
export class FacilityHomeModule { }
