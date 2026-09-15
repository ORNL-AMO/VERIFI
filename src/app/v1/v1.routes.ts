import { Routes } from '@angular/router';
import { accountGuidReadyGuard, facilityReadyGuard, persistenceReadyGuard } from '@app/routing/workspace-readiness.guards';
import { AccountCustomDataPlaceholderComponent } from './account/data/account-custom-data-placeholder.component';
import { AccountHomeComponent } from './account/home/account-home.component';
import { AccountPortfolioAnalysesTabComponent } from './account/portfolio/account-portfolio-analyses-tab/account-portfolio-analyses-tab.component';
import { AccountPortfolioComponent } from './account/portfolio/account-portfolio.component';
import { AccountPortfolioEnergyUsesTabComponent } from './account/portfolio/account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from './account/portfolio/account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from './account/portfolio/account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPredictorsTabComponent } from './account/portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { AccountPortfolioReportsTabComponent } from './account/portfolio/account-portfolio-reports-tab/account-portfolio-reports-tab.component';
import { AccountSettingsComponent } from './account/settings/account-settings.component';
import { AccountSettingsBackupComponent } from './account/settings/backup/account-settings-backup.component';
import { AccountSettingsDeleteComponent } from './account/settings/delete/account-settings-delete.component';
import { AccountSettingsFinancialComponent } from './account/settings/financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from './account/settings/goals/account-settings-goals.component';
import { AccountSettingsPortfolioComponent } from './account/settings/portfolio/account-settings-portfolio.component';
import { AccountSettingsProfileComponent } from './account/settings/profile/account-settings-profile.component';
import { AccountSettingsStalenessComponent } from './account/settings/staleness/account-settings-staleness.component';
import { AccountSettingsUnitsComponent } from './account/settings/units/account-settings-units.component';
import { FacilityDataPlaceholderComponent } from './facility/data/facility-data-placeholder.component';
import { FacilityMetersComponent } from './facility/data/meters/facility-meters.component';
import { MeterWorkbenchMonthlyChartComponent } from './facility/data/meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from './facility/data/meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from './facility/data/meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from './facility/data/meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from './facility/data/meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchComponent } from './facility/data/meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from './facility/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterGroupWorkbenchGraphComponent } from './facility/data/meters/meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchTableComponent } from './facility/data/meters/meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchYearlyDataComponent } from './facility/data/meters/meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MeterGroupWorkbenchComponent } from './facility/data/meters/meter-group-workbench/meter-group-workbench.component';
import { MeterGroupingComponent } from './facility/data/meters/meter-grouping/meter-grouping.component';
import { MetersDashboardComponent } from './facility/data/meters/meters-dashboard/meters-dashboard.component';
import { FacilityHomeComponent } from './facility/home/facility-home.component';
import { FacilitySettingsComponent } from './facility/settings/facility-settings.component';
import { FacilitySettingsBackupComponent } from './facility/settings/backup/facility-settings-backup.component';
import { FacilitySettingsDeleteComponent } from './facility/settings/delete/facility-settings-delete.component';
import { FacilitySettingsFinancialComponent } from './facility/settings/financial/facility-settings-financial.component';
import { FacilitySettingsGoalsComponent } from './facility/settings/goals/facility-settings-goals.component';
import { PortfolioTransitionSettingsComponent } from './facility/settings/portfolio-transition/portfolio-transition-settings.component';
import { FacilitySettingsProfileComponent } from './facility/settings/profile/facility-settings-profile.component';
import { FacilitySettingsStalenessComponent } from './facility/settings/staleness/facility-settings-staleness.component';
import { FacilitySettingsUnitsComponent } from './facility/settings/units/facility-settings-units.component';
import { accountHomeCanonicalGuard, facilityHomeCanonicalGuard, singleSiteAccountRedirectGuard } from './routing/canonical-route.guards';
import { ShellComponent } from './shell/shell.component';
import { WorkspaceShellComponent } from './shell/workspace-shell/workspace-shell.component';
import { WelcomeComponent } from './welcome/welcome.component';

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
