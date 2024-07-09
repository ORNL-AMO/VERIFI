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
import { FacilityInformationSetupComponent } from './facility-details/facility-information-setup/facility-information-setup.component';
import { FacilityUnitsSetupComponent } from './facility-details/facility-units-setup/facility-units-setup.component';
import { FacilityReportingSetupComponent } from './facility-details/facility-reporting-setup/facility-reporting-setup.component';
import { SetupWizardSidebarComponent } from './setup-wizard-sidebar/setup-wizard-sidebar.component';
import { FormsModule } from '@angular/forms';
import { FacilityDetailsComponent } from './facility-details/facility-details.component';
import { FacilityMetersSetupComponent } from './facility-details/facility-meters-setup/facility-meters-setup.component';
import { SetupWizardDataUploadComponent } from './setup-wizard-data-upload/setup-wizard-data-upload.component';
import { UploadFilesComponent } from './setup-wizard-data-upload/upload-files/upload-files.component';
import { ProcessTemplateFileComponent } from './setup-wizard-data-upload/process-template-file/process-template-file.component';
import { ProcessTemplateFacilitiesComponent } from './setup-wizard-data-upload/process-template-file/process-template-facilities/process-template-facilities.component';
import { ProcessTemplateMetersComponent } from './setup-wizard-data-upload/process-template-file/process-template-meters/process-template-meters.component';
import { ProcessTemplateMeterReadingsComponent } from './setup-wizard-data-upload/process-template-file/process-template-meter-readings/process-template-meter-readings.component';
import { ProcessTemplatePredictorsComponent } from './setup-wizard-data-upload/process-template-file/process-template-predictors/process-template-predictors.component';

@NgModule({
  declarations: [
    SetupWizardComponent,
    SetupWizardBannerComponent,
    SetupAccountComponent,
    SetupFacilitiesComponent,
    SetupConfirmationComponent,
    SetupWizardFooterComponent,
    FacilityInformationSetupComponent,
    FacilityUnitsSetupComponent,
    FacilityReportingSetupComponent,
    SetupWizardSidebarComponent,
    FacilityDetailsComponent,
    FacilityMetersSetupComponent,
    SetupWizardDataUploadComponent,
    UploadFilesComponent,
    ProcessTemplateFileComponent,
    ProcessTemplateFacilitiesComponent,
    ProcessTemplateMetersComponent,
    ProcessTemplateMeterReadingsComponent,
    ProcessTemplatePredictorsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SettingsFormsModule,
    FormsModule
  ]
})
export class SetupWizardModule { }
