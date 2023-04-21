import { Route } from "@angular/router";
import { CorporateInformationSetupComponent } from "src/app/setup-wizard/setup-account/corporate-information-setup/corporate-information-setup.component";
import { CorporateReportingSetupComponent } from "src/app/setup-wizard/setup-account/corporate-reporting-setup/corporate-reporting-setup.component";
import { CorporateUnitsSetupComponent } from "src/app/setup-wizard/setup-account/corporate-units-setup/corporate-units-setup.component";
import { SetupAccountComponent } from "src/app/setup-wizard/setup-account/setup-account.component";
import { SetupConfirmationComponent } from "src/app/setup-wizard/setup-confirmation/setup-confirmation.component";
import { FacilityInformationSetupComponent } from "src/app/setup-wizard/setup-facilities/facility-information-setup/facility-information-setup.component";
import { FacilityReportingSetupComponent } from "src/app/setup-wizard/setup-facilities/facility-reporting-setup/facility-reporting-setup.component";
import { FacilityUnitsSetupComponent } from "src/app/setup-wizard/setup-facilities/facility-units-setup/facility-units-setup.component";
import { SetupFacilitiesComponent } from "src/app/setup-wizard/setup-facilities/setup-facilities.component";
import { SetupWelcomeComponent } from "src/app/setup-wizard/setup-welcome/setup-welcome.component";
import { SetupWizardComponent } from "src/app/setup-wizard/setup-wizard.component";


export const SetupWizardRoutes: Route = {
    path: 'setup-wizard',
    component: SetupWizardComponent,
    children: [
        { path: '', pathMatch: 'full', redirectTo: 'welcome' },
        { path: 'welcome', component: SetupWelcomeComponent },
        {
            path: 'account-setup',
            component: SetupAccountComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'information-setup' },
                { path: 'information-setup', component: CorporateInformationSetupComponent },
                { path: 'units-setup', component: CorporateUnitsSetupComponent },
                { path: 'reporting-setup', component: CorporateReportingSetupComponent },

            ]
        },
        {
            path: 'facility-setup',
            component: SetupFacilitiesComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'information-setup' },
                { path: 'information-setup', component: FacilityInformationSetupComponent },
                { path: 'units-setup', component: FacilityUnitsSetupComponent },
                { path: 'reporting-setup', component: FacilityReportingSetupComponent },

            ]
        },
        { path: 'confirmation', component: SetupConfirmationComponent },

    ]
};