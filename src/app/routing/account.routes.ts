import { Route } from "@angular/router";
import { AccountAnalysisDashboardComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-dashboard.component";
import { AccountAnalysisResultsComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-results/account-analysis-results.component";
import { AnnualAccountAnalysisComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-results/annual-account-analysis/annual-account-analysis.component";
import { MonthlyAccountAnalysisComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-results/monthly-account-analysis/monthly-account-analysis.component";
import { AccountAnalysisSetupComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-setup/account-analysis-setup.component";
import { AccountAnalysisComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis.component";
import { SelectFacilityAnalysisItemsComponent } from "src/app/data-evaluation/account/account-analysis/select-facility-analysis-items/select-facility-analysis-items.component";
import { AccountHomeComponent } from "src/app/data-evaluation/account/account-home/account-home.component";
import { AccountOverviewComponent } from "src/app/data-evaluation/account/account-overview/account-overview.component";
import { CostsOverviewComponent } from "src/app/data-evaluation/account/account-overview/costs-overview/costs-overview.component";
import { EmissionsOverviewComponent } from "src/app/data-evaluation/account/account-overview/emissions-overview/emissions-overview.component";
import { EnergyOverviewComponent } from "src/app/data-evaluation/account/account-overview/energy-overview/energy-overview.component";
import { OtherUtilityOverviewComponent } from "src/app/data-evaluation/account/account-overview/other-utility-overview/other-utility-overview.component";
import { WaterOverviewComponent } from "src/app/data-evaluation/account/account-overview/water-overview/water-overview.component";
import { AccountReportSetupComponent } from "src/app/data-evaluation/account/account-reports/account-report-setup/account-report-setup.component";
import { AccountReportsDashboardComponent } from "src/app/data-evaluation/account/account-reports/account-reports-dashboard/account-reports-dashboard.component";
import { AccountReportsComponent } from "src/app/data-evaluation/account/account-reports/account-reports.component";
import { BetterPlantsReportComponent } from "src/app/data-evaluation/account/account-reports/better-plants-report/better-plants-report.component";
import { DataOverviewReportComponent } from "src/app/data-evaluation/account/account-reports/data-overview-report/data-overview-report.component";
import { AccountSettingsComponent } from "src/app/data-evaluation/account/account-settings/account-settings.component";
import { AccountComponent } from "src/app/data-evaluation/account/account.component";
import { CustomDatabaseComponent } from "src/app/shared/custom-database/custom-database.component";
import { EmissionsDataDashboardComponent } from "src/app/shared/custom-database/regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component";
import { EmissionsDataFormComponent } from "src/app/shared/custom-database/regional-emissions-data/emissions-data-form/emissions-data-form.component";
import { RegionalEmissionsDataComponent } from "src/app/shared/custom-database/regional-emissions-data/regional-emissions-data.component";
import { AccountAnalysisEnergyDashboardComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-energy-dashboard/account-analysis-energy-dashboard.component";
import { AccountAnalysisWaterDashboardComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-water-dashboard/account-analysis-water-dashboard.component";
import { AccountAnalysisFacilitiesSummaryComponent } from "src/app/data-evaluation/account/account-analysis/account-analysis-results/account-analysis-facilities-summary/account-analysis-facilities-summary.component";
import { PerformanceReportComponent } from "src/app/data-evaluation/account/account-reports/performance-report/performance-report.component";
import { BetterClimateReportComponent } from "src/app/data-evaluation/account/account-reports/better-climate-report/better-climate-report.component";
import { CustomFuelDataComponent } from "src/app/shared/custom-database/custom-fuel-data/custom-fuel-data.component";
import { CustomFuelDataDashboardComponent } from "src/app/shared/custom-database/custom-fuel-data/custom-fuel-data-dashboard/custom-fuel-data-dashboard.component";
import { CustomFuelDataFormComponent } from "src/app/shared/custom-database/custom-fuel-data/custom-fuel-data-form/custom-fuel-data-form.component";
import { CustomGWPComponent } from "src/app/shared/custom-database/custom-gwp/custom-gwp.component";
import { CustomGwpDashboardComponent } from "src/app/shared/custom-database/custom-gwp/custom-gwp-dashboard/custom-gwp-dashboard.component";
import { CustomGwpFormComponent } from "src/app/shared/custom-database/custom-gwp/custom-gwp-form/custom-gwp-form.component";
import { AnalysisReportComponent } from "src/app/data-evaluation/account/account-reports/analysis-report/analysis-report.component";
import { AccountEmissionFactorsReportComponent } from "../data-evaluation/account/account-reports/account-emission-factors-report/account-emission-factors-report/account-emission-factors-report.component";
import { AccountSavingsReportComponent } from "../data-evaluation/account/account-reports/account-savings-report/account-savings-report.component";

export const AccountRoutes: Route = {
    path: 'account',
    component: AccountComponent,
    children: [
        {
            path: '',
            pathMatch: 'full',
            redirectTo: 'home'
        },
        {
            path: 'home',
            component: AccountHomeComponent
        },
        {
            path: 'overview',
            component: AccountOverviewComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'energy' },
                { path: 'energy', component: EnergyOverviewComponent },
                { path: 'costs', component: CostsOverviewComponent },
                { path: 'emissions', component: EmissionsOverviewComponent },
                { path: 'water', component: WaterOverviewComponent },
                { path: 'other', component: OtherUtilityOverviewComponent },

            ]
        },
        {
            path: 'settings',
            component: AccountSettingsComponent
        },
        {
            path: 'reports',
            component: AccountReportsComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
                { path: 'dashboard', component: AccountReportsDashboardComponent },
                { path: 'setup', component: AccountReportSetupComponent },
                { path: 'better-plants-report', component: BetterPlantsReportComponent },
                { path: 'data-overview-report', component: DataOverviewReportComponent },
                { path: 'performance-report', component: PerformanceReportComponent },
                { path: 'better-climate-report', component: BetterClimateReportComponent },
                { path: 'analysis-report', component: AnalysisReportComponent },
                { path: 'account-savings-report', component: AccountSavingsReportComponent },
                { path: 'account-emission-factors-report', component: AccountEmissionFactorsReportComponent }
            ]
        },
        {
            path: 'analysis',
            component: AccountAnalysisComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
                {
                    path: 'dashboard',
                    component: AccountAnalysisDashboardComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'energy' },
                        { path: 'energy', component: AccountAnalysisEnergyDashboardComponent },
                        { path: 'water', component: AccountAnalysisWaterDashboardComponent }
                    ]
                },
                { path: 'setup', component: AccountAnalysisSetupComponent },
                { path: 'select-items', component: SelectFacilityAnalysisItemsComponent },
                {
                    path: 'results',
                    component: AccountAnalysisResultsComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'annual-analysis' },
                        { path: 'monthly-analysis', component: MonthlyAccountAnalysisComponent },
                        { path: 'annual-analysis', component: AnnualAccountAnalysisComponent },
                        {
                            path: 'facilities-summary',
                            component: AccountAnalysisFacilitiesSummaryComponent
                        }
                    ]
                }
            ]
        },
        {
            path: 'custom-data',
            component: CustomDatabaseComponent,
            children: [
                { path: '', pathMatch: 'full', redirectTo: 'emissions' },
                {
                    path: 'emissions',
                    component: RegionalEmissionsDataComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
                        { path: 'dashboard', component: EmissionsDataDashboardComponent },
                        { path: 'edit/:id', component: EmissionsDataFormComponent },
                        { path: 'add', component: EmissionsDataFormComponent }

                    ]
                },
                {
                    path: 'fuels', component: CustomFuelDataComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
                        { path: 'dashboard', component: CustomFuelDataDashboardComponent },
                        { path: 'edit/:id', component: CustomFuelDataFormComponent },
                        { path: 'add', component: CustomFuelDataFormComponent }

                    ]
                },
                {
                    path: 'gwp', component: CustomGWPComponent,
                    children: [
                        { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
                        { path: 'dashboard', component: CustomGwpDashboardComponent },
                        { path: 'edit/:id', component: CustomGwpFormComponent },
                        { path: 'add', component: CustomGwpFormComponent }

                    ]
                }
            ]
        }
    ]
};