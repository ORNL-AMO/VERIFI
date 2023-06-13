import { Route } from "@angular/router";
import { AccountAnalysisDashboardComponent } from "src/app/account/account-analysis/account-analysis-dashboard/account-analysis-dashboard.component";
import { AccountAnalysisResultsComponent } from "src/app/account/account-analysis/account-analysis-results/account-analysis-results.component";
import { AnnualAccountAnalysisComponent } from "src/app/account/account-analysis/account-analysis-results/annual-account-analysis/annual-account-analysis.component";
import { MonthlyAccountAnalysisComponent } from "src/app/account/account-analysis/account-analysis-results/monthly-account-analysis/monthly-account-analysis.component";
import { AccountAnalysisSetupComponent } from "src/app/account/account-analysis/account-analysis-setup/account-analysis-setup.component";
import { AccountAnalysisComponent } from "src/app/account/account-analysis/account-analysis.component";
import { SelectFacilityAnalysisItemsComponent } from "src/app/account/account-analysis/select-facility-analysis-items/select-facility-analysis-items.component";
import { AccountHomeComponent } from "src/app/account/account-home/account-home.component";
import { AccountOverviewComponent } from "src/app/account/account-overview/account-overview.component";
import { CostsOverviewComponent } from "src/app/account/account-overview/costs-overview/costs-overview.component";
import { EmissionsOverviewComponent } from "src/app/account/account-overview/emissions-overview/emissions-overview.component";
import { EnergyOverviewComponent } from "src/app/account/account-overview/energy-overview/energy-overview.component";
import { OtherUtilityOverviewComponent } from "src/app/account/account-overview/other-utility-overview/other-utility-overview.component";
import { WaterOverviewComponent } from "src/app/account/account-overview/water-overview/water-overview.component";
import { AccountReportSetupComponent } from "src/app/account/account-reports/account-report-setup/account-report-setup.component";
import { AccountReportsDashboardComponent } from "src/app/account/account-reports/account-reports-dashboard/account-reports-dashboard.component";
import { AccountReportsComponent } from "src/app/account/account-reports/account-reports.component";
import { BetterPlantsReportComponent } from "src/app/account/account-reports/better-plants-report/better-plants-report.component";
import { DataOverviewReportComponent } from "src/app/account/account-reports/data-overview-report/data-overview-report.component";
import { AccountSettingsComponent } from "src/app/account/account-settings/account-settings.component";
import { AccountComponent } from "src/app/account/account.component";
import { CustomDatabaseComponent } from "src/app/account/custom-database/custom-database.component";
import { EmissionsDataDashboardComponent } from "src/app/account/custom-database/regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component";
import { EmissionsDataFormComponent } from "src/app/account/custom-database/regional-emissions-data/emissions-data-form/emissions-data-form.component";
import { RegionalEmissionsDataComponent } from "src/app/account/custom-database/regional-emissions-data/regional-emissions-data.component";
import { AccountAnalysisEnergyDashboardComponent } from "../account/account-analysis/account-analysis-dashboard/account-analysis-energy-dashboard/account-analysis-energy-dashboard.component";
import { AccountAnalysisWaterDashboardComponent } from "../account/account-analysis/account-analysis-dashboard/account-analysis-water-dashboard/account-analysis-water-dashboard.component";

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
                { path: 'data-overview-report', component: DataOverviewReportComponent }
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
                        { path: 'annual-analysis', component: AnnualAccountAnalysisComponent }
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
            ]
        }
    ]
};