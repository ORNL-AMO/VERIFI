import { Route } from "@angular/router";
import { SetupAccountComponent } from "src/app/setup-wizard/setup-account/setup-account.component";
import { SetupConfirmationComponent } from "src/app/setup-wizard/setup-confirmation/setup-confirmation.component";
import { SetupFacilitiesComponent } from "src/app/setup-wizard/setup-facilities/setup-facilities.component";
import { SetupWizardComponent } from "src/app/setup-wizard/setup-wizard.component";
import { FacilityDetailsComponent } from "../setup-wizard/facility-details/facility-details.component";
import { FacilityMetersSetupComponent } from "../setup-wizard/facility-details/facility-meters-setup/facility-meters-setup.component";
import { SetupWizardDataUploadComponent } from "../setup-wizard/setup-wizard-data-upload/setup-wizard-data-upload.component";
import { FacilitySettingsSetupComponent } from "../setup-wizard/facility-details/facility-settings-setup/facility-settings-setup.component";


export const SetupWizardRoutes: Route = {
    path: 'setup-wizard',
    component: SetupWizardComponent,
    children: [
        { path: '', pathMatch: 'full', redirectTo: 'account-setup' },
        {
            path: 'account-setup',
            component: SetupAccountComponent,
        },
        {
            path: 'facility-setup',
            component: SetupFacilitiesComponent,
        },
        {
            path: 'facility-details/:id',
            component: FacilityDetailsComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'settings' },
                { path: 'settings', component: FacilitySettingsSetupComponent },
                { path: 'meters-setup', component: FacilityMetersSetupComponent },
            ]
        },
        { path: 'confirmation', component: SetupConfirmationComponent },

    ]
};