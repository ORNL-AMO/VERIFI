import { Routes } from '@angular/router';
import { accountGuidReadyGuard, facilityReadyGuard, persistenceReadyGuard } from '@app/routing/workspace-readiness.guards';
import { AccountCustomDataPlaceholderComponent } from '@app/v1/account/data/account-custom-data-placeholder.component';
import { AccountHomeComponent } from '@app/v1/account/home/account-home.component';
import { AccountPortfolioAnalysesTabComponent } from '@app/v1/account/portfolio/account-portfolio-analyses-tab/account-portfolio-analyses-tab.component';
import { AccountPortfolioComponent } from '@app/v1/account/portfolio/account-portfolio.component';
import { AccountPortfolioEnergyUsesTabComponent } from '@app/v1/account/portfolio/account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from '@app/v1/account/portfolio/account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from '@app/v1/account/portfolio/account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPredictorsTabComponent } from '@app/v1/account/portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { AccountPortfolioReportsTabComponent } from '@app/v1/account/portfolio/account-portfolio-reports-tab/account-portfolio-reports-tab.component';
import { AccountSettingsComponent } from '@app/v1/account/settings/account-settings.component';
import { AccountSettingsBackupComponent } from '@app/v1/account/settings/backup/account-settings-backup.component';
import { AccountSettingsDeleteComponent } from '@app/v1/account/settings/delete/account-settings-delete.component';
import { AccountSettingsFinancialComponent } from '@app/v1/account/settings/financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from '@app/v1/account/settings/goals/account-settings-goals.component';
import { AccountSettingsPortfolioComponent } from '@app/v1/account/settings/portfolio/account-settings-portfolio.component';
import { AccountSettingsProfileComponent } from '@app/v1/account/settings/profile/account-settings-profile.component';
import { AccountSettingsStalenessComponent } from '@app/v1/account/settings/staleness/account-settings-staleness.component';
import { AccountSettingsUnitsComponent } from '@app/v1/account/settings/units/account-settings-units.component';
import { FacilityDataPlaceholderComponent } from '@app/v1/facility/data/facility-data-placeholder.component';
import { FacilityMetersComponent } from '@app/v1/facility/data/meters/facility-meters.component';
import { MeterWorkbenchBillInspectionComponent } from '@app/v1/facility/data/meters/meter-workbench/bill-inspection/meter-workbench-bill-inspection.component';
import { MeterWorkbenchMonthlyChartComponent } from '@app/v1/facility/data/meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from '@app/v1/facility/data/meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from '@app/v1/facility/data/meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from '@app/v1/facility/data/meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from '@app/v1/facility/data/meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchComponent } from '@app/v1/facility/data/meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from '@app/v1/facility/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterGroupWorkbenchGraphComponent } from '@app/v1/facility/data/meters/meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchTableComponent } from '@app/v1/facility/data/meters/meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchYearlyDataComponent } from '@app/v1/facility/data/meters/meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MeterGroupWorkbenchComponent } from '@app/v1/facility/data/meters/meter-group-workbench/meter-group-workbench.component';
import { MeterGroupingComponent } from '@app/v1/facility/data/meters/meter-grouping/meter-grouping.component';
import { MetersDashboardComponent } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard.component';
import { FacilityHomeComponent } from '@app/v1/facility/home/facility-home.component';
import { FacilitySettingsComponent } from '@app/v1/facility/settings/facility-settings.component';
import { FacilitySettingsBackupComponent } from '@app/v1/facility/settings/backup/facility-settings-backup.component';
import { FacilitySettingsDeleteComponent } from '@app/v1/facility/settings/delete/facility-settings-delete.component';
import { FacilitySettingsFinancialComponent } from '@app/v1/facility/settings/financial/facility-settings-financial.component';
import { FacilitySettingsGoalsComponent } from '@app/v1/facility/settings/goals/facility-settings-goals.component';
import { PortfolioTransitionSettingsComponent } from '@app/v1/facility/settings/portfolio-transition/portfolio-transition-settings.component';
import { FacilitySettingsProfileComponent } from '@app/v1/facility/settings/profile/facility-settings-profile.component';
import { FacilitySettingsStalenessComponent } from '@app/v1/facility/settings/staleness/facility-settings-staleness.component';
import { FacilitySettingsUnitsComponent } from '@app/v1/facility/settings/units/facility-settings-units.component';
import { accountHomeCanonicalGuard, facilityHomeCanonicalGuard, singleSiteAccountRedirectGuard } from '@app/v1/routing/canonical-route.guards';
import { ShellComponent } from '@app/v1/shell/shell.component';
import { WorkspaceShellComponent } from '@app/v1/shell/workspace-shell/workspace-shell.component';
import { WelcomeComponent } from '@app/v1/welcome/welcome.component';

export const V1Routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: WelcomeComponent, canActivate: [persistenceReadyGuard] },
      { path: 'workspace', pathMatch: 'full', redirectTo: '' },
      {
        path: 'workspace/account/:accountGuid',
        component: WorkspaceShellComponent,
        canActivate: [accountGuidReadyGuard, singleSiteAccountRedirectGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'home/overview' },
          { path: 'home', pathMatch: 'full', redirectTo: 'home/overview' },
          {
            path: 'home/:detail',
            component: AccountHomeComponent,
            canActivate: [accountHomeCanonicalGuard]
          },
          {
            path: 'data',
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'portfolio' },
              {
                path: 'portfolio',
                component: AccountPortfolioComponent,
                children: [
                  { path: '', pathMatch: 'full', redirectTo: 'facilities' },
                  { path: 'facilities', component: AccountPortfolioFacilitiesTabComponent },
                  { path: 'meters', component: AccountPortfolioMetersTabComponent },
                  { path: 'predictors', component: AccountPortfolioPredictorsTabComponent },
                  { path: 'energy-uses', component: AccountPortfolioEnergyUsesTabComponent },
                  { path: 'analyses', component: AccountPortfolioAnalysesTabComponent },
                  { path: 'reports', component: AccountPortfolioReportsTabComponent },
                  { path: '**', redirectTo: 'facilities' }
                ]
              },
              { path: 'custom-grid-factors', component: AccountCustomDataPlaceholderComponent, data: { title: 'Grid Factors' } },
              { path: 'custom-fuels', component: AccountCustomDataPlaceholderComponent, data: { title: 'Fuels' } },
              { path: 'custom-gwps', component: AccountCustomDataPlaceholderComponent, data: { title: 'Global Warming Potentials' } },
              { path: '**', redirectTo: 'portfolio' }
            ]
          },
          {
            path: 'settings',
            component: AccountSettingsComponent,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'profile' },
              { path: 'profile', component: AccountSettingsProfileComponent },
              { path: 'units', component: AccountSettingsUnitsComponent },
              { path: 'goals', component: AccountSettingsGoalsComponent },
              { path: 'financial', component: AccountSettingsFinancialComponent },
              { path: 'staleness', component: AccountSettingsStalenessComponent },
              { path: 'backup', component: AccountSettingsBackupComponent },
              { path: 'portfolio', component: AccountSettingsPortfolioComponent },
              { path: 'delete', component: AccountSettingsDeleteComponent },
              { path: '**', redirectTo: 'profile' }
            ]
          },
          { path: '**', redirectTo: 'home/overview' }
        ]
      },
      {
        path: 'workspace/facility/:facilityGuid',
        component: WorkspaceShellComponent,
        canActivate: [facilityReadyGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'home/overview' },
          { path: 'home', pathMatch: 'full', redirectTo: 'home/overview' },
          {
            path: 'home/:detail',
            component: FacilityHomeComponent,
            canActivate: [facilityHomeCanonicalGuard]
          },
          {
            path: 'data',
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'meters' },
              {
                path: 'meters',
                component: FacilityMetersComponent,
                children: [
                  { path: '', pathMatch: 'full', component: MetersDashboardComponent },
                  {
                    path: ':meterGuid',
                    component: MeterWorkbenchComponent,
                    children: [
                      { path: '', pathMatch: 'full', redirectTo: 'settings' },
                      { path: 'settings', component: MeterWorkbenchSettingsComponent, data: { meterTab: 'settings' } },
                      { path: 'readings', component: MeterWorkbenchReadingsComponent, data: { meterTab: 'readings' } },
                      { path: 'bill-inspection', component: MeterWorkbenchBillInspectionComponent, data: { meterTab: 'bill-inspection' } },
                      { path: 'monthly', component: MeterWorkbenchMonthlyDataComponent, data: { meterTab: 'monthly' } },
                      { path: 'monthly-chart', component: MeterWorkbenchMonthlyChartComponent, data: { meterTab: 'monthly-chart' } },
                      { path: 'yearly', component: MeterWorkbenchYearlyDataComponent, data: { meterTab: 'yearly' } },
                      { path: 'quality', component: MeterWorkbenchQualityReportComponent, data: { meterTab: 'quality' } },
                      { path: '**', redirectTo: 'settings' }
                    ]
                  }
                ]
              },
              {
                path: 'meter-grouping',
                component: FacilityMetersComponent,
                children: [
                  { path: '', pathMatch: 'full', component: MeterGroupingComponent },
                  {
                    path: ':groupGuid',
                    component: MeterGroupWorkbenchComponent,
                    children: [
                      { path: '', pathMatch: 'full', redirectTo: 'monthly-table' },
                      { path: 'monthly-table', component: MeterGroupWorkbenchTableComponent, data: { meterGroupTab: 'monthly-table', meterGroupPeriod: 'monthly' } },
                      { path: 'monthly-chart', component: MeterGroupWorkbenchGraphComponent, data: { meterGroupTab: 'monthly-chart', meterGroupPeriod: 'monthly' } },
                      { path: 'monthly-graph', pathMatch: 'full', redirectTo: 'monthly-chart' },
                      { path: 'yearly', component: MeterGroupWorkbenchYearlyDataComponent, data: { meterGroupTab: 'yearly', meterGroupPeriod: 'yearly' } },
                      { path: 'yearly-table', pathMatch: 'full', redirectTo: 'yearly' },
                      { path: 'yearly-graph', pathMatch: 'full', redirectTo: 'yearly' },
                      { path: '**', redirectTo: 'monthly-table' }
                    ]
                  }
                ]
              },
              { path: 'predictors', component: FacilityDataPlaceholderComponent, data: { title: 'Predictors' } },
              { path: 'energy-uses', component: FacilityDataPlaceholderComponent, data: { title: 'Energy Uses' } },
              { path: '**', redirectTo: 'meters' }
            ]
          },
          {
            path: 'settings',
            component: FacilitySettingsComponent,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'profile' },
              { path: 'profile', component: FacilitySettingsProfileComponent },
              { path: 'units', component: FacilitySettingsUnitsComponent },
              { path: 'goals', component: FacilitySettingsGoalsComponent },
              { path: 'financial', component: FacilitySettingsFinancialComponent },
              { path: 'staleness', component: FacilitySettingsStalenessComponent },
              { path: 'backup', component: FacilitySettingsBackupComponent },
              { path: 'portfolio', component: PortfolioTransitionSettingsComponent },
              { path: 'delete', component: FacilitySettingsDeleteComponent },
              { path: '**', redirectTo: 'profile' }
            ]
          },
          { path: '**', redirectTo: 'home/overview' }
        ]
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
