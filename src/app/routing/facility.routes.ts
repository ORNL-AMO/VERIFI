import { Route } from "@angular/router";
import { AccountAnalysisListComponent } from "src/app/facility/analysis/account-analysis-list/account-analysis-list.component";
import { AnalysisDashboardComponent } from "src/app/facility/analysis/analysis-dashboard/analysis-dashboard.component";
import { AnalysisComponent } from "src/app/facility/analysis/analysis.component";
import { AnalysisSetupComponent } from "src/app/facility/analysis/run-analysis/analysis-setup/analysis-setup.component";
import { AnnualFacilityAnalysisComponent } from "src/app/facility/analysis/run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis.component";
import { FacilityAnalysisComponent } from "src/app/facility/analysis/run-analysis/facility-analysis/facility-analysis.component";
import { MonthlyFacilityAnalysisComponent } from "src/app/facility/analysis/run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis.component";
import { AnnualAnalysisSummaryComponent } from "src/app/facility/analysis/run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component";
import { GroupAnalysisOptionsComponent } from "src/app/facility/analysis/run-analysis/group-analysis/group-analysis-options/group-analysis-options.component";
import { GroupAnalysisComponent } from "src/app/facility/analysis/run-analysis/group-analysis/group-analysis.component";
import { MonthlyAnalysisSummaryComponent } from "src/app/facility/analysis/run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary.component";
import { RegressionModelSelectionComponent } from "src/app/facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-model-selection.component";
import { RunAnalysisComponent } from "src/app/facility/analysis/run-analysis/run-analysis.component";
import { FacilityHomeComponent } from "src/app/facility/facility-home/facility-home.component";
import { FacilityCostOverviewComponent } from "src/app/facility/facility-overview/facility-cost-overview/facility-cost-overview.component";
import { FacilityEmissionsOverviewComponent } from "src/app/facility/facility-overview/facility-emissions-overview/facility-emissions-overview.component";
import { FacilityEnergyOverviewComponent } from "src/app/facility/facility-overview/facility-energy-overview/facility-energy-overview.component";
import { FacilityOverviewComponent } from "src/app/facility/facility-overview/facility-overview.component";
import { FacilityWaterOverviewComponent } from "src/app/facility/facility-overview/facility-water-overview/facility-water-overview.component";
import { FacilitySettingsComponent } from "src/app/facility/facility-settings/facility-settings.component";
import { FacilityComponent } from "src/app/facility/facility.component";
import { CalanderizationComponent } from "src/app/facility/utility-data/calanderization/calanderization.component";
import { EnergyConsumptionComponent } from "src/app/facility/utility-data/energy-consumption/energy-consumption.component";
import { EditMeterComponent } from "src/app/facility/utility-data/energy-consumption/energy-source/edit-meter/edit-meter.component";
import { EnergySourceComponent } from "src/app/facility/utility-data/energy-consumption/energy-source/energy-source.component";
import { UtilityMetersTableComponent } from "src/app/facility/utility-data/energy-consumption/energy-source/utility-meters-table/utility-meters-table.component";
import { UtilityMeterDataComponent } from "src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.component";
import { MeterGroupingComponent } from "src/app/facility/utility-data/meter-grouping/meter-grouping.component";
import { UtilityDataComponent } from "src/app/facility/utility-data/utility-data.component";
import { CorrelationHeatmapComponent } from "src/app/facility/visualization/correlation-heatmap/correlation-heatmap.component";
import { CorrelationPlotMenuComponent } from "src/app/facility/visualization/correlation-plot-menu/correlation-plot-menu.component";
import { CorrelationPlotComponent } from "src/app/facility/visualization/correlation-plot/correlation-plot.component";
import { TimeSeriesComponent } from "src/app/facility/visualization/time-series/time-series.component";
import { VisualizationComponent } from "src/app/facility/visualization/visualization.component";
import { canDeactivateGuard } from "./can-deactivate.guard";
import { EnergyDashboardComponent } from "../facility/analysis/analysis-dashboard/energy-dashboard/energy-dashboard.component";
import { WaterDashboardComponent } from "../facility/analysis/analysis-dashboard/water-dashboard/water-dashboard.component";
import { PredictorsComponent } from "../facility/utility-data/predictors/predictors.component";
import { PredictorsManagementComponent } from "../facility/utility-data/predictors/predictors-management/predictors-management.component";
import { PredictorTableComponent } from "../shared/shared-predictors-content/predictor-table/predictor-table.component";
import { EditPredictorFormComponent } from "../shared/shared-predictors-content/edit-predictor-form/edit-predictor-form.component";
import { PredictorsDataComponent } from "../facility/utility-data/predictors/predictors-data/predictors-data.component";
import { PredictorsDataTableComponent } from "../shared/shared-predictors-content/predictors-data-table/predictors-data-table.component";
import { PredictorsDataFormComponent } from "../facility/utility-data/predictors/predictors-data/predictors-data-form/predictors-data-form.component";
import { CalculatedPredictorDataUpdateComponent } from "../facility/utility-data/predictors/predictors-data/calculated-predictor-data-update/calculated-predictor-data-update.component";
import { FacilityReportsComponent } from "../facility/facility-reports/facility-reports.component";
import { FacilityReportsDashboardComponent } from "../facility/facility-reports/facility-reports-dashboard/facility-reports-dashboard.component";
import { FacilityReportSetupComponent } from "../facility/facility-reports/facility-report-setup/facility-report-setup.component";
import { BankedGroupAnalysisComponent } from "../facility/analysis/run-analysis/group-analysis/banked-group-analysis/banked-group-analysis.component";
import { FacilityOverviewReportResultsComponent } from "../facility/facility-reports/report-results/facility-overview-report-results/facility-overview-report-results.component";
import { FacilityAnalysisReportResultsComponent } from "../facility/facility-reports/report-results/facility-analysis-report-results/facility-analysis-report-results.component";
import { FacilityAnalysisReportsDashboardComponent } from "../facility/facility-reports/facility-reports-dashboard/facility-analysis-reports-dashboard/facility-analysis-reports-dashboard.component";
import { FacilityOverviewReportsDashboardComponent } from "../facility/facility-reports/facility-reports-dashboard/facility-overview-reports-dashboard/facility-overview-reports-dashboard.component";
import { MeterDataTableComponent } from "../shared/shared-meter-content/meter-data/meter-data-table/meter-data-table.component";
import { EditBillComponent } from "../shared/shared-meter-content/edit-bill/edit-bill.component";

export const FacilityRoutes: Route = {
    path: 'facility/:id',
    component: FacilityComponent,
    children: [
        {
            path: '',
            pathMatch: 'full',
            redirectTo: 'home'
        },
        {
            path: 'home',
            component: FacilityHomeComponent
        },
        {
            path: 'overview',
            component: FacilityOverviewComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'energy' },
                { path: 'energy', component: FacilityEnergyOverviewComponent },
                { path: 'costs', component: FacilityCostOverviewComponent },
                { path: 'emissions', component: FacilityEmissionsOverviewComponent },
                { path: 'water', component: FacilityWaterOverviewComponent },
            ]
        },
        {
            path: 'settings',
            component: FacilitySettingsComponent
        },
        {
            path: 'utility',
            component: UtilityDataComponent,
            children: [
                {
                    path: 'energy-consumption', component: EnergyConsumptionComponent,
                    children: [
                        {
                            path: '',
                            pathMatch: 'full',
                            redirectTo: 'energy-source'
                        },
                        {
                            path: 'energy-source',
                            component: EnergySourceComponent,
                            children: [
                                {
                                    path: '',
                                    pathMatch: 'full',
                                    redirectTo: 'meters'
                                },
                                {
                                    path: 'meters',
                                    component: UtilityMetersTableComponent
                                },
                                {
                                    path: 'edit-meter/:id',
                                    component: EditMeterComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'new-meter',
                                    component: EditMeterComponent,
                                    canDeactivate: [canDeactivateGuard]
                                }
                            ]
                        },
                        {
                            path: 'utility-meter/:id',
                            component: UtilityMeterDataComponent,
                            children: [
                                {
                                    path: '',
                                    pathMatch: 'full',
                                    redirectTo: 'data-table'
                                },
                                {
                                    path: 'data-table',
                                    component: MeterDataTableComponent
                                },
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
                    ],
                },
                { path: 'monthly-meter-data', component: CalanderizationComponent },
                { path: 'meter-groups', component: MeterGroupingComponent },
                {
                    path: 'predictors',
                    component: PredictorsComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'manage' },
                        {
                            path: 'manage',
                            component: PredictorsManagementComponent,
                            children: [
                                {
                                    path: '',
                                    pathMatch: 'full',
                                    redirectTo: 'predictor-table'
                                },
                                {
                                    path: 'predictor-table',
                                    component: PredictorTableComponent
                                },

                                {
                                    path: 'edit-predictor/:id',
                                    component: EditPredictorFormComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'add-predictor',
                                    component: EditPredictorFormComponent,
                                    canDeactivate: [canDeactivateGuard]
                                }
                            ]
                        },
                        {
                            path: 'predictor/:id',
                            component: PredictorsDataComponent,
                            children: [
                                {
                                    path: '',
                                    pathMatch: 'full',
                                    redirectTo: 'entries-table'
                                },
                                {
                                    path: 'entries-table',
                                    component: PredictorsDataTableComponent
                                },

                                {
                                    path: 'edit-entry/:id',
                                    component: PredictorsDataFormComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'add-entry',
                                    component: PredictorsDataFormComponent,
                                    canDeactivate: [canDeactivateGuard]
                                },
                                {
                                    path: 'update-calculated-entries',
                                    component: CalculatedPredictorDataUpdateComponent
                                    // canDeactivate: [canDeactivateGuard]
                                },
                            ]
                        }
                    ]
                },
                // { path: 'upload-data', component: UploadDataComponent },
                { path: '', pathMatch: 'full', redirectTo: 'energy-consumption' }
            ]
        },
        {
            path: 'visualization',
            component: VisualizationComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'options' },
                {
                    path: 'options',
                    component: CorrelationPlotMenuComponent
                },
                {
                    path: 'correlation',
                    component: CorrelationPlotComponent
                },
                {
                    path: 'variance',
                    component: CorrelationHeatmapComponent
                },
                { path: 'time-series', component: TimeSeriesComponent }
            ]
        },
        {
            path: 'analysis',
            component: AnalysisComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'analysis-dashboard' },
                {
                    path: 'analysis-dashboard',
                    component: AnalysisDashboardComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'energy' },
                        { path: 'energy', component: EnergyDashboardComponent },
                        { path: 'water', component: WaterDashboardComponent },
                    ]
                },
                {
                    path: 'run-analysis',
                    component: RunAnalysisComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'analysis-setup' },
                        { path: 'analysis-setup', component: AnalysisSetupComponent },
                        {
                            path: 'group-analysis/:id',
                            component: GroupAnalysisComponent,
                            children: [
                                { path: '', pathMatch: 'full', redirectTo: 'options' },
                                { path: 'options', component: GroupAnalysisOptionsComponent },
                                { path: 'model-selection', component: RegressionModelSelectionComponent },
                                { path: 'annual-analysis', component: AnnualAnalysisSummaryComponent },
                                { path: 'monthly-analysis', component: MonthlyAnalysisSummaryComponent },
                                { path: 'banked-analysis', component: BankedGroupAnalysisComponent }
                            ]
                        },
                        {
                            path: 'facility-analysis',
                            component: FacilityAnalysisComponent,
                            children: [
                                { path: '', pathMatch: 'full', redirectTo: 'annual-analysis' },
                                { path: 'annual-analysis', component: AnnualFacilityAnalysisComponent },
                                { path: 'monthly-analysis', component: MonthlyFacilityAnalysisComponent }
                            ]
                        },
                        {
                            path: 'account-analysis',
                            component: AccountAnalysisListComponent
                        }
                    ]
                }
            ]
        },
        {
            path: 'reports',
            component: FacilityReportsComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
                {
                    path: 'dashboard',
                    component: FacilityReportsDashboardComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'analysis' },
                        { path: 'analysis', component: FacilityAnalysisReportsDashboardComponent },
                        { path: 'overview', component: FacilityOverviewReportsDashboardComponent },
                    ]
                },
                { path: 'setup', component: FacilityReportSetupComponent },
                { path: 'analysis-report', component: FacilityAnalysisReportResultsComponent },
                { path: 'overview-report', component: FacilityOverviewReportResultsComponent }
            ]
        }
    ]
};