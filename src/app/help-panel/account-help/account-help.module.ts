import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountHelpComponent } from './account-help.component';
import { AccountHomeHelpComponent } from './account-home-help/account-home-help.component';
import { AccountOverviewHelpComponent } from './account-overview-help/account-overview-help.component';
import { AccountSettingsHelpComponent } from './account-settings-help/account-settings-help.component';
import { AccountReportsHelpComponent } from './account-reports-help/account-reports-help.component';
import { AccountAnalysisHelpComponent } from './account-analysis-help/account-analysis-help.component';
import { AccountCustomDataHelpComponent } from './account-custom-data-help/account-custom-data-help.component';



@NgModule({
  declarations: [
    AccountHelpComponent,
    AccountHomeHelpComponent,
    AccountOverviewHelpComponent,
    AccountSettingsHelpComponent,
    AccountReportsHelpComponent,
    AccountAnalysisHelpComponent,
    AccountCustomDataHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AccountHelpComponent
  ]
})
export class AccountHelpModule { }
