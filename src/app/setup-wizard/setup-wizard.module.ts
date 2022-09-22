import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SetupWizardComponent } from './setup-wizard.component';
import { SetupWizardBannerComponent } from './setup-wizard-banner/setup-wizard-banner.component';
import { SetupAccountComponent } from './setup-account/setup-account.component';
import { SetupFacilitiesComponent } from './setup-facilities/setup-facilities.component';
import { SetupConfirmationComponent } from './setup-confirmation/setup-confirmation.component';
import { SetupWelcomeComponent } from './setup-welcome/setup-welcome.component';
import { RouterModule } from '@angular/router';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';
import { SetupWizardFooterComponent } from './setup-wizard-footer/setup-wizard-footer.component';
import { CorporateInformationSetupComponent } from './setup-account/corporate-information-setup/corporate-information-setup.component';
import { CorporateUnitsSetupComponent } from './setup-account/corporate-units-setup/corporate-units-setup.component';
import { CorporateReportingSetupComponent } from './setup-account/corporate-reporting-setup/corporate-reporting-setup.component';
import { FacilityInformationSetupComponent } from './setup-facilities/facility-information-setup/facility-information-setup.component';
import { FacilityUnitsSetupComponent } from './setup-facilities/facility-units-setup/facility-units-setup.component';
import { FacilityReportingSetupComponent } from './setup-facilities/facility-reporting-setup/facility-reporting-setup.component';

@NgModule({
  declarations: [
    SetupWizardComponent,
    SetupWizardBannerComponent,
    SetupAccountComponent,
    SetupFacilitiesComponent,
    SetupConfirmationComponent,
    SetupWelcomeComponent,
    SetupWizardFooterComponent,
    CorporateInformationSetupComponent,
    CorporateUnitsSetupComponent,
    CorporateReportingSetupComponent,
    FacilityInformationSetupComponent,
    FacilityUnitsSetupComponent,
    FacilityReportingSetupComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SettingsFormsModule
  ]
})
export class SetupWizardModule { }
