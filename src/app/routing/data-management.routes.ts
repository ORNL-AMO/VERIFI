import { Route } from "@angular/router";
import { DataManagementComponent } from "../data-management/data-management.component";
import { AccountSetupComponent } from "../data-management/account-setup/account-setup.component";
import { AccountFacilitiesComponent } from "../data-management/account-facilities/account-facilities.component";
import { FacilityDataComponent } from "../data-management/account-facilities/facility-data/facility-data.component";
import { FacilitySetupComponent } from "../data-management/account-facilities/facility-data/facility-setup/facility-setup.component";
import { DataManagementImportComponent } from "../data-management/data-management-import/data-management-import.component";
import { UploadFilesComponent } from "../data-management/data-management-import/upload-files/upload-files.component";
import { ProcessTemplateFileComponent } from "../data-management/data-management-import/process-template-file/process-template-file.component";
import { ProcessTemplateFacilitiesComponent } from "../data-management/data-management-import/process-template-file/process-template-facilities/process-template-facilities.component";
import { FacilityMetersTableComponent } from "../data-management/account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component";
import { FacilityMeterComponent } from "../data-management/account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component";
import { MeterDataComponent } from "../shared/shared-meter-content/meter-data/meter-data.component";
import { MeterDataTableComponent } from "../shared/shared-meter-content/meter-data/meter-data-table/meter-data-table.component";
import { FacilitiesListComponent } from "../data-management/account-facilities/facilities-list/facilities-list.component";
import { EditBillComponent } from "../shared/shared-meter-content/edit-bill/edit-bill.component";
import { canDeactivateGuard } from "./can-deactivate.guard";
import { FacilityMeterMonthlyDataComponent } from "../data-management/account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component";
import { FacilityPredictorComponent } from "../data-management/account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component";
import { FacilityPredictorsTableComponent } from "../data-management/account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component";
import { FacilityPredictorDataTableComponent } from "../data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-table/facility-predictor-data-table.component";
import { FacilityPredictorDataEntryComponent } from "../data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-entry/facility-predictor-data-entry.component";
import { FacilityPredictorDataBulkUpdateComponent } from "../data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-bulk-update/facility-predictor-data-bulk-update.component";
import { ProcessGeneralFileComponent } from "../data-management/data-management-import/process-general-file/process-general-file.component";
import { SelectWorksheetComponent } from "../data-management/data-management-import/process-general-file/select-worksheet/select-worksheet.component";
import { IdentifyColumnsComponent } from "../data-management/data-management-import/process-general-file/identify-columns/identify-columns.component";
import { MapMetersToFacilitiesComponent } from "../data-management/data-management-import/process-general-file/map-meters-to-facilities/map-meters-to-facilities.component";
import { ProcessMetersComponent } from "../data-management/data-management-import/shared-process-file/process-meters/process-meters.component";
import { ProcessMeterReadingsComponent } from "../data-management/data-management-import/shared-process-file/process-meter-readings/process-meter-readings.component";
import { MapPredictorsToFacilitiesComponent } from "../data-management/data-management-import/process-general-file/map-predictors-to-facilities/map-predictors-to-facilities.component";
import { ProcessPredictorsComponent } from "../data-management/data-management-import/shared-process-file/process-predictors/process-predictors.component";
import { ProcessPredictorReadingsComponent } from "../data-management/data-management-import/shared-process-file/process-predictor-readings/process-predictor-readings.component";
import { SubmitImportDataComponent } from "../data-management/data-management-import/shared-process-file/submit-import-data/submit-import-data.component";
import { DataManagementHomeComponent } from "../data-management/data-management-home/data-management-home.component";
import { WeatherDataRoutes } from "./weather-data.routes";
import { CustomGWPComponent } from "../shared/custom-database/custom-gwp/custom-gwp.component";
import { RegionalEmissionsDataComponent } from "../shared/custom-database/regional-emissions-data/regional-emissions-data.component";
import { CustomFuelDataComponent } from "../shared/custom-database/custom-fuel-data/custom-fuel-data.component";
import { EmissionsDataDashboardComponent } from "../shared/custom-database/regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component";
import { EmissionsDataFormComponent } from "../shared/custom-database/regional-emissions-data/emissions-data-form/emissions-data-form.component";
import { CustomFuelDataDashboardComponent } from "../shared/custom-database/custom-fuel-data/custom-fuel-data-dashboard/custom-fuel-data-dashboard.component";
import { CustomFuelDataFormComponent } from "../shared/custom-database/custom-fuel-data/custom-fuel-data-form/custom-fuel-data-form.component";
import { CustomGwpFormComponent } from "../shared/custom-database/custom-gwp/custom-gwp-form/custom-gwp-form.component";
import { CustomGwpDashboardComponent } from "../shared/custom-database/custom-gwp/custom-gwp-dashboard/custom-gwp-dashboard.component";
import { AccountCustomDataComponent } from "../data-management/account-custom-data/account-custom-data.component";
import { SetMeterGroupingComponent } from "../shared/shared-meter-content/set-meter-grouping/set-meter-grouping.component";

export const DataManagementRoutes: Route = {
    path: 'data-management/:id',
    component: DataManagementComponent,
    children: [
        { path: '', pathMatch: 'full', redirectTo: 'home' },
        {
            path: 'home',
            component: DataManagementHomeComponent
        },
        {
            path: 'account-setup',
            component: AccountSetupComponent
        },
        {
            path: 'import-data',
            component: DataManagementImportComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'upload-files' },
                { path: 'upload-files', component: UploadFilesComponent },
                {
                    path: 'process-template-file/:id',
                    component: ProcessTemplateFileComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'facilities' },
                        { path: 'facilities', component: ProcessTemplateFacilitiesComponent },
                        { path: 'confirm-meters', component: ProcessMetersComponent },
                        { path: 'meter-readings', component: ProcessMeterReadingsComponent },
                        { path: 'confirm-predictors', component: ProcessPredictorsComponent },
                        { path: 'predictor-data', component: ProcessPredictorReadingsComponent },
                        { path: 'review-and-submit', component: SubmitImportDataComponent }
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
                        { path: 'confirm-meters', component: ProcessMetersComponent },
                        { path: 'meter-readings', component: ProcessMeterReadingsComponent },
                        { path: 'map-predictors-to-facilities', component: MapPredictorsToFacilitiesComponent },
                        { path: 'confirm-predictors', component: ProcessPredictorsComponent },
                        { path: 'predictor-data', component: ProcessPredictorReadingsComponent },
                        { path: 'review-and-submit', component: SubmitImportDataComponent }
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
                            path: 'meter-grouping',
                            component: SetMeterGroupingComponent,
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
        },
        WeatherDataRoutes,
        {
            path: 'account-custom-data',
            component: AccountCustomDataComponent,
            children: [
                {
                    path: 'custom-grid-factors',
                    component: RegionalEmissionsDataComponent,
                    children: [
                        { path: '', component: EmissionsDataDashboardComponent },
                        { path: 'edit/:id', component: EmissionsDataFormComponent },
                        { path: 'add', component: EmissionsDataFormComponent }

                    ]
                },
                {
                    path: 'custom-gwps',
                    component: CustomGWPComponent,
                    children: [
                        { path: '', component: CustomGwpDashboardComponent },
                        { path: 'edit/:id', component: CustomGwpFormComponent },
                        { path: 'add', component: CustomGwpFormComponent }
                    ]
                },
                {
                    path: 'custom-fuels',
                    component: CustomFuelDataComponent,
                    children: [
                        { path: '', component: CustomFuelDataDashboardComponent },
                        { path: 'edit/:id', component: CustomFuelDataFormComponent },
                        { path: 'add', component: CustomFuelDataFormComponent }

                    ]
                }
            ]
        }
    ]
}