import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountHomeComponent } from './account-home.component';
import { AccountHomeSummaryComponent } from './account-home-summary/account-home-summary.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { AccountWaterReductionGoalComponent } from './account-water-card/account-water-reduction-goal/account-water-reduction-goal.component';
import { AccountEnergyReductionGoalComponent } from './account-energy-card/account-energy-reduction-goal/account-energy-reduction-goal.component';
import { AccountEnergyCardComponent } from './account-energy-card/account-energy-card.component';
import { AccountWaterCardComponent } from './account-water-card/account-water-card.component';
import { AccountAnnualAnalysisTableComponent } from './account-annual-analysis-table/account-annual-analysis-table.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';



@NgModule({
  declarations: [
    AccountHomeComponent,
    AccountHomeSummaryComponent,
    AccountWaterReductionGoalComponent,
    AccountEnergyReductionGoalComponent,
    AccountEnergyCardComponent,
    AccountWaterCardComponent,
    AccountAnnualAnalysisTableComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    SharedAnalysisModule,
    CalculatingSpinnerModule,
    DataOverviewModule
  ]
})
export class AccountHomeModule { }
