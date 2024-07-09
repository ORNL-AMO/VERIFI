import { Route } from "@angular/router";
import { SetupAccountComponent } from "src/app/setup-wizard/setup-account/setup-account.component";
import { SetupConfirmationComponent } from "src/app/setup-wizard/setup-confirmation/setup-confirmation.component";
import { FacilityInformationSetupComponent } from "src/app/setup-wizard/facility-details/facility-information-setup/facility-information-setup.component";
import { FacilityReportingSetupComponent } from "src/app/setup-wizard/facility-details/facility-reporting-setup/facility-reporting-setup.component";
import { FacilityUnitsSetupComponent } from "src/app/setup-wizard/facility-details/facility-units-setup/facility-units-setup.component";
import { SetupFacilitiesComponent } from "src/app/setup-wizard/setup-facilities/setup-facilities.component";
import { SetupWelcomeComponent } from "src/app/setup-wizard/setup-welcome/setup-welcome.component";
import { SetupWizardComponent } from "src/app/setup-wizard/setup-wizard.component";
import { FacilityDetailsComponent } from "../setup-wizard/facility-details/facility-details.component";
import { FacilityMetersSetupComponent } from "../setup-wizard/facility-details/facility-meters-setup/facility-meters-setup.component";
import { SetupWizardDataUploadComponent } from "../setup-wizard/setup-wizard-data-upload/setup-wizard-data-upload.component";
import { UploadFilesComponent } from "../setup-wizard/setup-wizard-data-upload/upload-files/upload-files.component";
import { ProcessTemplateFacilitiesComponent } from "../setup-wizard/setup-wizard-data-upload/process-template-file/process-template-facilities/process-template-facilities.component";
import { ProcessTemplateMetersComponent } from "../setup-wizard/setup-wizard-data-upload/process-template-file/process-template-meters/process-template-meters.component";
import { ProcessTemplateMeterReadingsComponent } from "../setup-wizard/setup-wizard-data-upload/process-template-file/process-template-meter-readings/process-template-meter-readings.component";
import { ProcessTemplatePredictorsComponent } from "../setup-wizard/setup-wizard-data-upload/process-template-file/process-template-predictors/process-template-predictors.component";
import { ProcessTemplateFileComponent } from "../setup-wizard/setup-wizard-data-upload/process-template-file/process-template-file.component";


export const SetupWizardRoutes: Route = {
    path: 'setup-wizard',
    component: SetupWizardComponent,
    children: [
        { path: '', pathMatch: 'full', redirectTo: 'welcome' },
        { path: 'welcome', component: SetupWelcomeComponent },
        {
            path: 'account-setup',
            component: SetupAccountComponent,
        },
        {
            path: 'data-upload',
            component: SetupWizardDataUploadComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'upload-files' },
                { path: 'upload-files', component: UploadFilesComponent },
                {
                    path: 'process-template-file/:id',
                    component: ProcessTemplateFileComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'facilities' },
                        { path: 'facilities', component: ProcessTemplateFacilitiesComponent },
                        { path: 'meters', component: ProcessTemplateMetersComponent },
                        { path: 'meter-readings', component: ProcessTemplateMeterReadingsComponent },
                        { path: 'predictors', component: ProcessTemplatePredictorsComponent }
                    ]
                },
                // { path: 'information-setup', component: CorporateInformationSetupComponent },
                // { path: 'units-setup', component: CorporateUnitsSetupComponent },
                // { path: 'reporting-setup', component: CorporateReportingSetupComponent },

            ]
        },
        {
            path: 'facility-setup',
            component: SetupFacilitiesComponent,
        },
        {
            path: 'facility-details/:id',
            component: FacilityDetailsComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'information-setup' },
                { path: 'information-setup', component: FacilityInformationSetupComponent },
                { path: 'units-setup', component: FacilityUnitsSetupComponent },
                { path: 'reporting-setup', component: FacilityReportingSetupComponent },
                { path: 'meters-setup', component: FacilityMetersSetupComponent },
            ]
        },
        { path: 'confirmation', component: SetupConfirmationComponent },

    ]
};