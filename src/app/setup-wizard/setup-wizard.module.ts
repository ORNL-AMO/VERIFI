import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SetupWizardComponent } from './setup-wizard.component';
import { SetupWizardBannerComponent } from './setup-wizard-banner/setup-wizard-banner.component';
import { SetupAccountComponent } from './setup-account/setup-account.component';
import { SetupFacilitiesComponent } from './setup-facilities/setup-facilities.component';
import { SetupConfirmationComponent } from './setup-confirmation/setup-confirmation.component';
import { RouterModule } from '@angular/router';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';
import { SetupWizardFooterComponent } from './setup-wizard-footer/setup-wizard-footer.component';
import { SetupWizardSidebarComponent } from './setup-wizard-sidebar/setup-wizard-sidebar.component';
import { FormsModule } from '@angular/forms';
import { FacilityDetailsComponent } from './facility-details/facility-details.component';
import { FacilityMetersSetupComponent } from './facility-details/facility-meters-setup/facility-meters-setup.component';
import { SetupWizardDataUploadComponent } from './setup-wizard-data-upload/setup-wizard-data-upload.component';
import { FacilitySettingsSetupComponent } from './facility-details/facility-settings-setup/facility-settings-setup.component';

@NgModule({
  declarations: [
    SetupWizardComponent,
    SetupWizardBannerComponent,
    SetupAccountComponent,
    SetupFacilitiesComponent,
    SetupConfirmationComponent,
    SetupWizardFooterComponent,
    SetupWizardSidebarComponent,
    FacilityDetailsComponent,
    FacilityMetersSetupComponent,
    SetupWizardDataUploadComponent,
    FacilitySettingsSetupComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SettingsFormsModule,
    FormsModule
  ]
})
export class SetupWizardModule { }
