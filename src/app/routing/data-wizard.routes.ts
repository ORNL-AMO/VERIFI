import { Route } from "@angular/router";
import { DataWizardComponent } from "../data-wizard/data-wizard.component";
import { AccountSetupComponent } from "../data-wizard/account-setup/account-setup.component";
import { AccountFacilitiesComponent } from "../data-wizard/account-facilities/account-facilities.component";
import { FacilityDataComponent } from "../data-wizard/account-facilities/facility-data/facility-data.component";
import { FacilitySetupComponent } from "../data-wizard/account-facilities/facility-data/facility-setup/facility-setup.component";
import { DataWizardImportComponent } from "../data-wizard/data-wizard-import/data-wizard-import.component";
import { UploadFilesComponent } from "../data-wizard/data-wizard-import/upload-files/upload-files.component";
import { ProcessTemplateFileComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-file.component";
import { ProcessTemplateFacilitiesComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-facilities/process-template-facilities.component";
import { ProcessTemplateMeterReadingsComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-meter-readings/process-template-meter-readings.component";
import { ProcessTemplatePredictorsComponent } from "../data-wizard/data-wizard-import/process-template-file/process-template-predictors/process-template-predictors.component";
import { FacilityMetersTableComponent } from "../data-wizard/account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component";
import { FacilityMeterComponent } from "../data-wizard/account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component";
import { MeterDataComponent } from "../shared/shared-meter-content/meter-data/meter-data.component";
import { MeterDataTableComponent } from "../shared/shared-meter-content/meter-data/meter-data-table/meter-data-table.component";
import { FacilitiesListComponent } from "../data-wizard/account-facilities/facilities-list/facilities-list.component";
import { EditBillComponent } from "../shared/shared-meter-content/edit-bill/edit-bill.component";
import { canDeactivateGuard } from "./can-deactivate.guard";
import { FacilityMeterMonthlyDataComponent } from "../data-wizard/account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component";
import { FacilityPredictorComponent } from "../data-wizard/account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component";
import { FacilityPredictorsTableComponent } from "../data-wizard/account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component";
import { FacilityPredictorDataTableComponent } from "../data-wizard/account-facilities/facility-data/facility-predictors/facility-predictor-data-table/facility-predictor-data-table.component";
import { FacilityPredictorDataEntryComponent } from "../data-wizard/account-facilities/facility-data/facility-predictors/facility-predictor-data-entry/facility-predictor-data-entry.component";
import { FacilityPredictorDataBulkUpdateComponent } from "../data-wizard/account-facilities/facility-data/facility-predictors/facility-predictor-data-bulk-update/facility-predictor-data-bulk-update.component";
import { ProcessGeneralFileComponent } from "../data-wizard/data-wizard-import/process-general-file/process-general-file.component";
import { SelectWorksheetComponent } from "../data-wizard/data-wizard-import/process-general-file/select-worksheet/select-worksheet.component";
import { IdentifyColumnsComponent } from "../data-wizard/data-wizard-import/process-general-file/identify-columns/identify-columns.component";
import { MapMetersToFacilitiesComponent } from "../data-wizard/data-wizard-import/process-general-file/map-meters-to-facilities/map-meters-to-facilities.component";
import { ProcessMetersComponent } from "../data-wizard/data-wizard-import/shared-process-file/process-meters/process-meters.component";

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
                        { path: 'meters', component: ProcessMetersComponent },
                        { path: 'meter-readings', component: ProcessTemplateMeterReadingsComponent },
                        { path: 'predictors', component: ProcessTemplatePredictorsComponent }
                    ]
                },
                {
                    path: 'process-general-file/:id',
                    component: ProcessGeneralFileComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'select-worksheet' },
                        { path: 'select-worksheet', component: SelectWorksheetComponent },
                        { path: 'identify-columns', component: IdentifyColumnsComponent },
                        { path: 'map-meters-to-facilities', component: MapMetersToFacilitiesComponent },
                        { path: 'confirm-meters', component: ProcessMetersComponent }
                        // { path: 'set-facility-meters', component: SetFacilityMetersComponent },
                        // { path: 'set-facility-predictors', component: SetFacilityPredictorsComponent },
                        // { path: 'manage-meters', component: ManageMetersComponent },
                        // { path: 'template-facilities', component: TemplateFacilitiesComponent },
                        // { path: 'confirm-readings', component: ConfirmReadingsComponent },
                        // { path: 'confirm-predictors', component: ConfirmPredictorsComponent },
                        // { path: 'submit', component: ConfirmAndSubmitComponent }
                    ]
                }
            ]
        },
        {
            path: 'facilities',
            component: AccountFacilitiesComponent,
            children: [
                {
                    path: '',
                    component: FacilitiesListComponent
                },
                {
                    path: ':id',
                    component: FacilityDataComponent,
                    children: [
                        // { path: '', pathMatch: 'full', redirectTo: 'setup' },
                        {
                            path: '',
                            component: FacilitySetupComponent
                        },
                        {
                            path: 'meters',
                            component: FacilityMetersTableComponent,
                        },
                        {
                            path: 'meters/:id',
                            children: [
                                {
                                    path: '',
                                    component: FacilityMeterComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'meter-data',
                                    component: MeterDataComponent,
                                    children: [
                                        { path: '', component: MeterDataTableComponent },
                                        {
                                            path: 'edit-bill/:id',
                                            component: EditBillComponent,
                                            canDeactivate: [canDeactivateGuard]
                                        },
                                        {
                                            path: 'new-bill',
                                            component: EditBillComponent,
                                            canDeactivate: [canDeactivateGuard]
                                        }
                                    ]
                                },
                                { path: 'meter-monthly-data', component: FacilityMeterMonthlyDataComponent }
                            ]

                        },
                        {
                            path: 'predictors',
                            component: FacilityPredictorsTableComponent
                        },
                        {
                            path: 'predictors/:id',
                            children: [
                                {
                                    path: '',
                                    component: FacilityPredictorComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                // {
                                //     path: 'edit-predictor',
                                //     component: EditPredictorFormComponent,
                                //     canDeactivate: [canDeactivateGuard]
                                // },
                                {
                                    path: 'predictor-data',
                                    children: [
                                        {
                                            path: '',
                                            component: FacilityPredictorDataTableComponent
                                        },
                                        {
                                            path: 'edit-entry/:id',
                                            component: FacilityPredictorDataEntryComponent,
                                            canDeactivate: [canDeactivateGuard]
                                        },
                                        {
                                            path: 'update-calculated-entries',
                                            component: FacilityPredictorDataBulkUpdateComponent
                                            // canDeactivate: [canDeactivateGuard]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}