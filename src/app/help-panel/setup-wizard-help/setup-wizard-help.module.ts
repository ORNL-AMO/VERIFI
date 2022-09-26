import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SetupWizardHelpComponent } from './setup-wizard-help.component';
import { WelcomeHelpComponent } from './welcome-help/welcome-help.component';
import { AccountSetupHelpComponent } from './account-setup-help/account-setup-help.component';
import { FacilitySetupHelpComponent } from './facility-setup-help/facility-setup-help.component';
import { ConfirmNewAccountHelpComponent } from './confirm-new-account-help/confirm-new-account-help.component';



@NgModule({
  declarations: [
    SetupWizardHelpComponent,
    WelcomeHelpComponent,
    AccountSetupHelpComponent,
    FacilitySetupHelpComponent,
    ConfirmNewAccountHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    SetupWizardHelpComponent
  ]
})
export class SetupWizardHelpModule { }
