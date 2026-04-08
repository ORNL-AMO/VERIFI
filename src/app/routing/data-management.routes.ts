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
import { PrivacyNoticeComponent } from "../static-content/privacy-notice/privacy-notice.component";
import { AboutComponent } from "../static-content/about/about.component";
import { AcknowledgmentsComponent } from "../static-content/acknowledgments/acknowledgments.component";
import { FeedbackComponent } from "../static-content/feedback/feedback.component";
import { HelpComponent } from "../static-content/help/help.component";
import { FacilityMeterDataQualityReportComponent } from "../data-management/account-facilities/facility-data/facility-meters/facility-meter-data-quality-report/facility-meter-data-quality-report.component";
import { FacilityPredictorDataQualityReportComponent } from "../data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-quality-report/facility-predictor-data-quality-report.component";
import { MeterChargesVisualizationComponent } from "../data-management/account-facilities/facility-data/facility-meters/meter-charges-visualization/meter-charges-visualization.component";
import { FacilityEnergyUseGroupComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-use-group/facility-energy-use-group.component";
import { FacilityEnergyUseGroupManagementComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-use-group-management/facility-energy-use-group-management.component";
import { FacilityEnergyUseEquipmentComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-use-equipment/facility-energy-use-equipment.component";
import { FacilityEnergyUsesComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-uses.component";
import { FacilityEnergyUsesGroupSetupComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-group-setup/facility-energy-uses-group-setup.component";
import { FacilityEnergyUsesSummaryComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-summary/facility-energy-uses-summary.component";
import { FacilityEnergyUsesGroupSummaryComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-summary/facility-energy-uses-group-summary.component";
import { FootprintUploadSelectFacilityComponent } from "../data-management/data-management-import/process-footprint-tool-file/footprint-upload-select-facility/footprint-upload-select-facility.component";
import { FacilityEnergyUsesGroupFootprintComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint.component";
import { FacilityEnergyUsesFootprintComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint.component";
import { ManageMeterGroupingComponent } from "../shared/shared-meter-content/set-meter-grouping/manage-meter-grouping/manage-meter-grouping.component";
import { MeterGroupFormComponent } from "../shared/shared-meter-content/set-meter-grouping/meter-group-form/meter-group-form.component";
import { MeterGroupingResultsTableComponent } from "../shared/shared-meter-content/set-meter-grouping/meter-grouping-results-table/meter-grouping-results-table.component";
import { MeterGroupingResultsGraphComponent } from "../shared/shared-meter-content/set-meter-grouping/meter-grouping-results-graph/meter-grouping-results-graph.component";
import { FacilityEnergyUsesSetupOptionsComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/facility-energy-uses-setup-options.component";
import { NewEquipmentGroupSetupOptionsComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/new-equipment-group-setup-options/new-equipment-group-setup-options.component";
import { EditExistingGroupsSetupOptionsComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/edit-existing-groups-setup-options/edit-existing-groups-setup-options.component";
import { AddYearSetupOptionsComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/add-year-setup-options/add-year-setup-options.component";
import { FacilityMeterGroupsComponent } from "../data-management/account-facilities/facility-data/facility-meters/facility-meter-groups/facility-meter-groups.component";
import { FacilityMeterDataComponent } from "../data-management/account-facilities/facility-data/facility-meters/facility-meter-data/facility-meter-data.component";
import { FacilityEnergyUsesModifyAnnualDataComponent } from "../data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-modify-annual-data/facility-energy-uses-modify-annual-data.component";

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
                },
                {
                    path: 'process-footprint-tool-file/:id',
                    component: ProcessTemplateFileComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'select-facility' },
                        { path: 'select-facility', component: FootprintUploadSelectFacilityComponent },
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
                                    component: FacilityMeterDataComponent,
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
                                { path: 'meter-monthly-data', component: FacilityMeterMonthlyDataComponent },
                                { path: 'data-quality-report', component: FacilityMeterDataQualityReportComponent },
                                { path: 'meter-charges-visualization', component: MeterChargesVisualizationComponent }
                            ]

                        },
                        {
                            path: 'meter-grouping',
                            component: FacilityMeterGroupsComponent,
                            children: [
                                {
                                    path: '',
                                    pathMatch: 'full',
                                    redirectTo: 'manage'
                                },
                                {
                                    path: 'manage',
                                    component: ManageMeterGroupingComponent
                                },
                                {
                                    path: 'edit-group/:id',
                                    component: MeterGroupFormComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'data-table/:id',
                                    component: MeterGroupingResultsTableComponent
                                },
                                {
                                    path: 'data-chart/:id',
                                    component: MeterGroupingResultsGraphComponent
                                }
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
                                },
                                { path: 'data-quality-report', component: FacilityPredictorDataQualityReportComponent }
                            ]
                        },
                        {
                            path: 'energy-uses',
                            component: FacilityEnergyUsesComponent,
                            children: [
                                {
                                    path: '',
                                    component: FacilityEnergyUseGroupManagementComponent
                                },
                                {
                                    path: 'setup-options',
                                    component: FacilityEnergyUsesSetupOptionsComponent,
                                    children: [
                                        {
                                            path: 'new-groups',
                                            component: NewEquipmentGroupSetupOptionsComponent
                                        },
                                        {
                                            path: 'edit-groups',
                                            component: EditExistingGroupsSetupOptionsComponent
                                        },
                                        {
                                            path: 'add-year',
                                            component: AddYearSetupOptionsComponent
                                        }
                                    ]
                                },
                                {
                                    path: 'edit-existing',
                                    component: FacilityEnergyUsesGroupSetupComponent
                                },
                                {
                                    path: 'new-setup',
                                    component: FacilityEnergyUsesGroupSetupComponent
                                },
                                {
                                    path: 'modify-annual-data/:year',
                                    component: FacilityEnergyUsesModifyAnnualDataComponent
                                },
                                {
                                    path: 'summary',
                                    component: FacilityEnergyUsesSummaryComponent
                                },
                                {
                                    path: 'footprint',
                                    component: FacilityEnergyUsesFootprintComponent
                                },
                                {
                                    path: ':id',
                                    component: FacilityEnergyUseGroupComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: ':id/equipment/:equipmentId',
                                    component: FacilityEnergyUseEquipmentComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: ':id/summary',
                                    component: FacilityEnergyUsesGroupSummaryComponent
                                },
                                {
                                    path: ':id/footprint',
                                    component: FacilityEnergyUsesGroupFootprintComponent
                                }
                            ]
                        },
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
        },
        { path: 'privacy', component: PrivacyNoticeComponent },
        { path: 'about', component: AboutComponent },
        { path: 'acknowledgments', component: AcknowledgmentsComponent },
        { path: 'feedback', component: FeedbackComponent },
        { path: 'help', component: HelpComponent },
    ]
}