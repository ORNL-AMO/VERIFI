import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountHomeComponent } from './account-home.component';
import { AccountHomeSummaryComponent } from './account-home-summary/account-home-summary.component';
import { FacilityCardComponent } from './facility-card/facility-card.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';



@NgModule({
  declarations: [
    AccountHomeComponent,
    AccountHomeSummaryComponent,
    FacilityCardComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    SharedAnalysisModule,
    CalculatingSpinnerModule
  ]
})
export class AccountHomeModule { }
