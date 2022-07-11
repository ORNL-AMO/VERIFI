import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountHomeComponent } from './account-home.component';
import { AccountHomeSummaryComponent } from './account-home-summary/account-home-summary.component';
import { FacilityCardComponent } from './facility-card/facility-card.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';



@NgModule({
  declarations: [
    AccountHomeComponent,
    AccountHomeSummaryComponent,
    FacilityCardComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule
  ]
})
export class AccountHomeModule { }
