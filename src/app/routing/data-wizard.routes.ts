import { Route } from "@angular/router";
import { DataWizardComponent } from "../data-wizard/data-wizard.component";
import { AccountSetupComponent } from "../data-wizard/account-setup/account-setup.component";
import { AccountFacilitiesComponent } from "../data-wizard/account-facilities/account-facilities.component";
import { FacilityDataComponent } from "../data-wizard/facility-data/facility-data.component";
import { FacilitySetupComponent } from "../data-wizard/facility-data/facility-setup/facility-setup.component";
import { DataWizardImportComponent } from "../data-wizard/data-wizard-import/data-wizard-import.component";

export const DataWizardRoutes: Route = {
    path: 'data-wizard/:id',
    component: DataWizardComponent,
    children: [
        { path: '', pathMatch: 'full', redirectTo: 'account-setup' },
        {
            path: 'account-setup',
            component: AccountSetupComponent
        },
        {
            path: 'import-data',
            component: DataWizardImportComponent
        },
        {
            path: 'facilities',
            component: AccountFacilitiesComponent
        },
        {
            path: 'facility/:id',
            component: FacilityDataComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'setup' },
                {
                    path: 'setup',
                    component: FacilitySetupComponent
                }

            ]
        }
    ]
}