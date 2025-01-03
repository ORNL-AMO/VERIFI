import { Route } from "@angular/router";
import { DataWizardComponent } from "../data-wizard/data-wizard.component";
import { AccountSetupComponent } from "../data-wizard/account-setup/account-setup.component";
import { AccountFacilitiesComponent } from "../data-wizard/account-facilities/account-facilities.component";
import { FacilityDataComponent } from "../data-wizard/facility-data/facility-data.component";
import { FacilitySetupComponent } from "../data-wizard/facility-data/facility-setup/facility-setup.component";
import { DataWizardImportComponent } from "../data-wizard/data-wizard-import/data-wizard-import.component";
import { UploadFilesComponent } from "../data-wizard/data-wizard-import/upload-files/upload-files.component";
import { ProcessTemplateFileComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-file.component";
import { ProcessTemplateFacilitiesComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-facilities/process-template-facilities.component";
import { ProcessTemplateMetersComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-meters/process-template-meters.component";
import { ProcessTemplateMeterReadingsComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-meter-readings/process-template-meter-readings.component";
import { ProcessTemplatePredictorsComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-predictors/process-template-predictors.component";
import { FacilityMetersComponent } from "../data-wizard/facility-data/facility-meters/facility-meters.component";
import { FacilityMetersTableComponent } from "../data-wizard/facility-data/facility-meters/facility-meters-table/facility-meters-table.component";
import { FacilityMeterComponent } from "../data-wizard/facility-data/facility-meters/facility-meter/facility-meter.component";
import { FacilityMeterDataComponent } from "../data-wizard/facility-data/facility-meters/facility-meter-data/facility-meter-data.component";
import { FacilityPredictorsComponent } from "../data-wizard/facility-data/facility-predictors/facility-predictors.component";
import { MeterDataComponent } from "../shared/meter-data/meter-data.component";
import { MeterDataTableComponent } from "../shared/meter-data/meter-data-table/meter-data-table.component";
import { PredictorTableComponent } from "../shared/shared-predictors-content/predictor-table/predictor-table.component";
import { EditPredictorFormComponent } from "../shared/shared-predictors-content/edit-predictor-form/edit-predictor-form.component";
import { PredictorsDataTableComponent } from "../shared/shared-predictors-content/predictors-data-table/predictors-data-table.component";

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
            component: DataWizardImportComponent,
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
            ]
        },
        {
            path: 'facilities',
            component: AccountFacilitiesComponent
        },
        {
            path: 'facility/:id',
            component: FacilityDataComponent,
            children: [
                // { path: '', pathMatch: 'full', redirectTo: 'setup' },
                {
                    path: '',
                    component: FacilitySetupComponent
                },
                {
                    path: 'meters',
                    component: FacilityMetersComponent,
                    children: [
                        { path: '', component: FacilityMetersTableComponent },
                        { path: 'meter/:id', component: FacilityMeterComponent },
                        {
                            path: 'meter-data/:id',
                            component: MeterDataComponent,
                            children: [
                                { path: '', component: MeterDataTableComponent }
                            ]
                        }
                    ]
                },
                {
                    path: 'predictors',
                    component: FacilityPredictorsComponent,
                    children: [
                        { path: '', component: PredictorTableComponent },
                        { path: 'predictor/:id', component: EditPredictorFormComponent },
                        { path: 'predictor-data/:id', component: PredictorsDataTableComponent }
                    ]
                }
            ]
        }
    ]
}