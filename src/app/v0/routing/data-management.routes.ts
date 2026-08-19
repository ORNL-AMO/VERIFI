import { Route } from "@angular/router";
import { DataManagementComponent } from "@v0/data-management/data-management.component";
import { AccountSetupComponent } from "@v0/data-management/account-setup/account-setup.component";
import { AccountFacilitiesComponent } from "@v0/data-management/account-facilities/account-facilities.component";
import { FacilityDataComponent } from "@v0/data-management/account-facilities/facility-data/facility-data.component";
import { FacilitySetupComponent } from "@v0/data-management/account-facilities/facility-data/facility-setup/facility-setup.component";
import { DataManagementImportComponent } from "@v0/data-management/data-management-import/data-management-import.component";
import { UploadFilesComponent } from "@v0/data-management/data-management-import/upload-files/upload-files.component";
import { ProcessTemplateFileComponent } from "@v0/data-management/data-management-import/process-template-file/process-template-file.component";
import { ProcessTemplateFacilitiesComponent } from "@v0/data-management/data-management-import/process-template-file/process-template-facilities/process-template-facilities.component";
import { FacilityMetersTableComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/facility-meters-table/facility-meters-table.component";
import { FacilityMeterComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/facility-meter/facility-meter.component";
import { MeterDataTableComponent } from "@app/shared/shared-meter-content/meter-data/meter-data-table/meter-data-table.component";
import { FacilitiesListComponent } from "@v0/data-management/account-facilities/facilities-list/facilities-list.component";
import { EditBillComponent } from "@app/shared/shared-meter-content/edit-bill/edit-bill.component";
import { canDeactivateGuard } from "@v0/routing/can-deactivate.guard";
import { FacilityMeterMonthlyDataComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/facility-meter-monthly-data/facility-meter-monthly-data.component";
import { FacilityPredictorComponent } from "@v0/data-management/account-facilities/facility-data/facility-predictors/facility-predictor/facility-predictor.component";
import { FacilityPredictorsTableComponent } from "@v0/data-management/account-facilities/facility-data/facility-predictors/facility-predictors-table/facility-predictors-table.component";
import { FacilityPredictorDataTableComponent } from "@v0/data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-table/facility-predictor-data-table.component";
import { FacilityPredictorDataEntryComponent } from "@v0/data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-entry/facility-predictor-data-entry.component";
import { FacilityPredictorDataBulkUpdateComponent } from "@v0/data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-bulk-update/facility-predictor-data-bulk-update.component";
import { ProcessGeneralFileComponent } from "@v0/data-management/data-management-import/process-general-file/process-general-file.component";
import { SelectWorksheetComponent } from "@v0/data-management/data-management-import/process-general-file/select-worksheet/select-worksheet.component";
import { IdentifyColumnsComponent } from "@v0/data-management/data-management-import/process-general-file/identify-columns/identify-columns.component";
import { MapMetersToFacilitiesComponent } from "@v0/data-management/data-management-import/process-general-file/map-meters-to-facilities/map-meters-to-facilities.component";
import { ProcessMetersComponent } from "@v0/data-management/data-management-import/shared-process-file/process-meters/process-meters.component";
import { ProcessMeterReadingsComponent } from "@v0/data-management/data-management-import/shared-process-file/process-meter-readings/process-meter-readings.component";
import { MapPredictorsToFacilitiesComponent } from "@v0/data-management/data-management-import/process-general-file/map-predictors-to-facilities/map-predictors-to-facilities.component";
import { ProcessPredictorsComponent } from "@v0/data-management/data-management-import/shared-process-file/process-predictors/process-predictors.component";
import { ProcessPredictorReadingsComponent } from "@v0/data-management/data-management-import/shared-process-file/process-predictor-readings/process-predictor-readings.component";
import { SubmitImportDataComponent } from "@v0/data-management/data-management-import/shared-process-file/submit-import-data/submit-import-data.component";
import { DataManagementHomeComponent } from "@v0/data-management/data-management-home/data-management-home.component";
import { WeatherDataRoutes } from "@v0/routing/weather-data.routes";
import { CustomGWPComponent } from "@app/shared/custom-database/custom-gwp/custom-gwp.component";
import { RegionalEmissionsDataComponent } from "@app/shared/custom-database/regional-emissions-data/regional-emissions-data.component";
import { CustomFuelDataComponent } from "@app/shared/custom-database/custom-fuel-data/custom-fuel-data.component";
import { EmissionsDataDashboardComponent } from "@app/shared/custom-database/regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component";
import { EmissionsDataFormComponent } from "@app/shared/custom-database/regional-emissions-data/emissions-data-form/emissions-data-form.component";
import { CustomFuelDataDashboardComponent } from "@app/shared/custom-database/custom-fuel-data/custom-fuel-data-dashboard/custom-fuel-data-dashboard.component";
import { CustomFuelDataFormComponent } from "@app/shared/custom-database/custom-fuel-data/custom-fuel-data-form/custom-fuel-data-form.component";
import { CustomGwpFormComponent } from "@app/shared/custom-database/custom-gwp/custom-gwp-form/custom-gwp-form.component";
import { CustomGwpDashboardComponent } from "@app/shared/custom-database/custom-gwp/custom-gwp-dashboard/custom-gwp-dashboard.component";
import { AccountCustomDataComponent } from "@v0/data-management/account-custom-data/account-custom-data.component";
import { PrivacyNoticeComponent } from "@v0/static-content/privacy-notice/privacy-notice.component";
import { AboutComponent } from "@v0/static-content/about/about.component";
import { AcknowledgmentsComponent } from "@v0/static-content/acknowledgments/acknowledgments.component";
import { FeedbackComponent } from "@v0/static-content/feedback/feedback.component";
import { HelpComponent } from "@v0/static-content/help/help.component";
import { FacilityMeterDataQualityReportComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/facility-meter-data-quality-report/facility-meter-data-quality-report.component";
import { FacilityPredictorDataQualityReportComponent } from "@v0/data-management/account-facilities/facility-data/facility-predictors/facility-predictor-data-quality-report/facility-predictor-data-quality-report.component";
import { MeterChargesVisualizationComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/meter-charges-visualization/meter-charges-visualization.component";
import { FacilityEnergyUseGroupComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-use-group/facility-energy-use-group.component";
import { FacilityEnergyUseGroupManagementComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-use-group-management/facility-energy-use-group-management.component";
import { FacilityEnergyUseEquipmentComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-use-equipment/facility-energy-use-equipment.component";
import { FacilityEnergyUsesComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/facility-energy-uses.component";
import { FacilityEnergyUsesGroupSetupComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-group-setup/facility-energy-uses-group-setup.component";
import { FacilityEnergyUsesSummaryComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-summary/facility-energy-uses-summary.component";
import { FacilityEnergyUsesGroupSummaryComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-summary/facility-energy-uses-group-summary.component";
import { FootprintUploadSelectFacilityComponent } from "@v0/data-management/data-management-import/process-footprint-tool-file/footprint-upload-select-facility/footprint-upload-select-facility.component";
import { FacilityEnergyUsesGroupFootprintComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-group-footprint/facility-energy-uses-group-footprint.component";
import { FacilityEnergyUsesFootprintComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/results/facility-energy-uses-footprint/facility-energy-uses-footprint.component";
import { ManageMeterGroupingComponent } from "@app/shared/shared-meter-content/set-meter-grouping/manage-meter-grouping/manage-meter-grouping.component";
import { MeterGroupFormComponent } from "@app/shared/shared-meter-content/set-meter-grouping/meter-group-form/meter-group-form.component";
import { MeterGroupingResultsTableComponent } from "@app/shared/shared-meter-content/set-meter-grouping/meter-grouping-results-table/meter-grouping-results-table.component";
import { MeterGroupingResultsGraphComponent } from "@app/shared/shared-meter-content/set-meter-grouping/meter-grouping-results-graph/meter-grouping-results-graph.component";
import { FacilityEnergyUsesSetupOptionsComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/facility-energy-uses-setup-options.component";
import { NewEquipmentGroupSetupOptionsComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/new-equipment-group-setup-options/new-equipment-group-setup-options.component";
import { EditExistingGroupsSetupOptionsComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/edit-existing-groups-setup-options/edit-existing-groups-setup-options.component";
import { AddYearSetupOptionsComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-setup-options/add-year-setup-options/add-year-setup-options.component";
import { FacilityMeterGroupsComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/facility-meter-groups/facility-meter-groups.component";
import { FacilityMeterDataComponent } from "@v0/data-management/account-facilities/facility-data/facility-meters/facility-meter-data/facility-meter-data.component";
import { FacilityEnergyUsesModifyAnnualDataComponent } from "@v0/data-management/account-facilities/facility-data/facility-energy-uses/setup/facility-energy-uses-modify-annual-data/facility-energy-uses-modify-annual-data.component";
import { MapMeterGroupsToEquipmentComponent } from "@v0/data-management/data-management-import/process-footprint-tool-file/map-meter-groups-to-equipment/map-meter-groups-to-equipment.component";
import { ConfirmEnergyUsesUploadComponent } from "@v0/data-management/data-management-import/process-footprint-tool-file/confirm-energy-uses-upload/confirm-energy-uses-upload.component";
import { dataManagementChildGuard, facilityReadyGuard, persistenceReadyGuard } from "@app/routing/workspace-readiness.guards";

export const DataManagementRoutes: Route = {
    path: 'data-management/:id',
    component: DataManagementComponent,
    canActivate: [persistenceReadyGuard],
    canActivateChild: [dataManagementChildGuard],
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
                        { path: 'map-meter-groups-to-equipment', component: MapMeterGroupsToEquipmentComponent },
                        { path: 'review-and-submit', component: ConfirmEnergyUsesUploadComponent }
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
                    canActivate: [facilityReadyGuard],
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
                                    component: FacilityEnergyUsesGroupSetupComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'new-setup',
                                    component: FacilityEnergyUsesGroupSetupComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'modify-annual-data/:year',
                                    component: FacilityEnergyUsesModifyAnnualDataComponent,
                                    canDeactivate: [canDeactivateGuard]
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
