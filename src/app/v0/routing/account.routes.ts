import { Route } from "@angular/router";
import { AccountAnalysisDashboardComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-dashboard.component";
import { AccountAnalysisResultsComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-results/account-analysis-results.component";
import { AnnualAccountAnalysisComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-results/annual-account-analysis/annual-account-analysis.component";
import { MonthlyAccountAnalysisComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-results/monthly-account-analysis/monthly-account-analysis.component";
import { AccountAnalysisSetupComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-setup/account-analysis-setup.component";
import { AccountAnalysisComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis.component";
import { SelectFacilityAnalysisItemsComponent } from "@v0/data-evaluation/account/account-analysis/select-facility-analysis-items/select-facility-analysis-items.component";
import { AccountHomeComponent } from "@v0/data-evaluation/account/account-home/account-home.component";
import { AccountOverviewComponent } from "@v0/data-evaluation/account/account-overview/account-overview.component";
import { CostsOverviewComponent } from "@v0/data-evaluation/account/account-overview/costs-overview/costs-overview.component";
import { EmissionsOverviewComponent } from "@v0/data-evaluation/account/account-overview/emissions-overview/emissions-overview.component";
import { EnergyOverviewComponent } from "@v0/data-evaluation/account/account-overview/energy-overview/energy-overview.component";
import { WaterOverviewComponent } from "@v0/data-evaluation/account/account-overview/water-overview/water-overview.component";
import { AccountReportSetupComponent } from "@v0/data-evaluation/account/account-reports/account-report-setup/account-report-setup.component";
import { AccountReportsDashboardComponent } from "@v0/data-evaluation/account/account-reports/account-reports-dashboard/account-reports-dashboard.component";
import { AccountReportsComponent } from "@v0/data-evaluation/account/account-reports/account-reports.component";
import { BetterPlantsReportComponent } from "@v0/data-evaluation/account/account-reports/better-plants-report/better-plants-report.component";
import { DataOverviewReportComponent } from "@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-report.component";
import { AccountSettingsComponent } from "@v0/data-evaluation/account/account-settings/account-settings.component";
import { AccountComponent } from "@v0/data-evaluation/account/account.component";
import { CustomDatabaseComponent } from "@v0/shared/custom-database/custom-database.component";
import { EmissionsDataDashboardComponent } from "@v0/shared/custom-database/regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component";
import { EmissionsDataFormComponent } from "@v0/shared/custom-database/regional-emissions-data/emissions-data-form/emissions-data-form.component";
import { RegionalEmissionsDataComponent } from "@v0/shared/custom-database/regional-emissions-data/regional-emissions-data.component";
import { AccountAnalysisFacilitiesSummaryComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-results/account-analysis-facilities-summary/account-analysis-facilities-summary.component";
import { PerformanceReportComponent } from "@v0/data-evaluation/account/account-reports/performance-report/performance-report.component";
import { BetterClimateReportComponent } from "@v0/data-evaluation/account/account-reports/better-climate-report/better-climate-report.component";
import { CustomFuelDataComponent } from "@v0/shared/custom-database/custom-fuel-data/custom-fuel-data.component";
import { CustomFuelDataDashboardComponent } from "@v0/shared/custom-database/custom-fuel-data/custom-fuel-data-dashboard/custom-fuel-data-dashboard.component";
import { CustomFuelDataFormComponent } from "@v0/shared/custom-database/custom-fuel-data/custom-fuel-data-form/custom-fuel-data-form.component";
import { CustomGWPComponent } from "@v0/shared/custom-database/custom-gwp/custom-gwp.component";
import { CustomGwpDashboardComponent } from "@v0/shared/custom-database/custom-gwp/custom-gwp-dashboard/custom-gwp-dashboard.component";
import { CustomGwpFormComponent } from "@v0/shared/custom-database/custom-gwp/custom-gwp-form/custom-gwp-form.component";
import { AnalysisReportComponent } from "@v0/data-evaluation/account/account-reports/analysis-report/analysis-report.component";
import { AccountEmissionFactorsReportComponent } from "@v0/data-evaluation/account/account-reports/account-emission-factors-report/account-emission-factors-report/account-emission-factors-report.component";
import { AccountSavingsReportComponent } from "@v0/data-evaluation/account/account-reports/account-savings-report/account-savings-report.component";
import { AccountAnalysisDetailsTableComponent } from "@v0/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-details-table/account-analysis-details-table.component";
import { AccountReportsDataCheckComponent } from "@v0/data-evaluation/account/account-reports/account-reports-data-check/account-reports-data-check.component";
import { accountReadyGuard } from "@app/routing/workspace-readiness.guards";

export const AccountRoutes: Route = {
    path: 'account',
    component: AccountComponent,
    canActivate: [accountReadyGuard],
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
                { path: 'water', component: WaterOverviewComponent }
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
                { path: 'report-data-check', component: AccountReportsDataCheckComponent },
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
                        { path: '', component: AccountAnalysisDetailsTableComponent }
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
                { path: '', pathMatch: 'full', redirectTo: 'fuels' },
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
