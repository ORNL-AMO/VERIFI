import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EnergyConsumptionComponent } from './facility/utility-data/energy-consumption/energy-consumption.component';
import { EnergySourceComponent } from './facility/utility-data/energy-consumption/energy-source/energy-source.component';
import { StyleGuideComponent } from './static-content/style-guide/style-guide.component';
import { UtilityMeterDataComponent } from './facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.component';
import { MeterGroupingComponent } from './facility/utility-data/meter-grouping/meter-grouping.component';
import { PredictorDataComponent } from './facility/utility-data/predictor-data/predictor-data.component';
import { CalanderizationComponent } from './facility/utility-data/calanderization/calanderization.component';
import { VisualizationComponent } from './facility/utility-data/visualization/visualization.component';
import { PageNotFoundComponent } from './core-components/page-not-found/page-not-found.component';
import { AboutComponent } from './static-content/about/about.component';
import { AcknowledgmentsComponent } from './static-content/acknowledgments/acknowledgments.component';
import { FeedbackComponent } from './static-content/feedback/feedback.component';
import { HelpComponent } from './static-content/help/help.component';
import { UploadDataComponent } from './facility/utility-data/upload-data/upload-data.component';
import { OverviewReportComponent } from './account/overview-report/overview-report.component';
import { OverviewReportDashboardComponent } from './account/overview-report/overview-report-dashboard/overview-report-dashboard.component';
import { OverviewReportMenuComponent } from './account/overview-report/overview-report-menu/overview-report-menu.component';
import { BasicReportComponent } from './account/overview-report/basic-report/basic-report.component';
import { UtilityDataComponent } from './facility/utility-data/utility-data.component';
import { AnalysisComponent } from './facility/analysis/analysis.component';
import { AnalysisDashboardComponent } from './facility/analysis/analysis-dashboard/analysis-dashboard.component';
import { RunAnalysisComponent } from './facility/analysis/run-analysis/run-analysis.component';
import { AnalysisSetupComponent } from './facility/analysis/run-analysis/analysis-setup/analysis-setup.component';
import { GroupAnalysisComponent } from './facility/analysis/run-analysis/group-analysis/group-analysis.component';
import { GroupAnalysisOptionsComponent } from './facility/analysis/run-analysis/group-analysis/group-analysis-options/group-analysis-options.component';
import { FacilityAnalysisComponent } from './facility/analysis/run-analysis/facility-analysis/facility-analysis.component';
import { RegressionModelSelectionComponent } from './facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-model-selection.component';
import { AnnualAnalysisSummaryComponent } from './facility/analysis/run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component';
import { MonthlyAnalysisSummaryComponent } from './facility/analysis/run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary.component';
import { AnnualFacilityAnalysisComponent } from './facility/analysis/run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis.component';
import { MonthlyFacilityAnalysisComponent } from './facility/analysis/run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis.component';
import { AccountDashboardComponent } from './account/account-dashboard/account-dashboard.component';
import { FacilityDashboardComponent } from './facility/facility-dashboard/facility-dashboard.component';
import { AccountSettingsComponent } from './account/account-settings/account-settings.component';
import { AccountComponent } from './account/account.component';
import { FacilityComponent } from './facility/facility.component';
import { FacilitySettingsComponent } from './facility/facility-settings/facility-settings.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
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
        component: AccountDashboardComponent
      },
      {
        path: 'settings',
        component: AccountSettingsComponent
      },
      {
        path: 'reports',
        component: OverviewReportComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          { path: 'dashboard', component: OverviewReportDashboardComponent },
          { path: 'menu', component: OverviewReportMenuComponent },
          { path: 'basic-report', component: BasicReportComponent }
        ]
      },
    ]
  },
  {
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
        component: FacilityDashboardComponent
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
              { path: 'energy-source', component: EnergySourceComponent },
              { path: 'electricity', component: UtilityMeterDataComponent },
              { path: 'natural-gas', component: UtilityMeterDataComponent },
              { path: 'other-fuels', component: UtilityMeterDataComponent },
              { path: 'other-energy', component: UtilityMeterDataComponent },
              { path: 'water', component: UtilityMeterDataComponent },
              { path: 'waste-water', component: UtilityMeterDataComponent },
              { path: 'other-utility', component: UtilityMeterDataComponent },
            ],
          },
          { path: 'monthly-meter-data', component: CalanderizationComponent },
          { path: 'meter-groups', component: MeterGroupingComponent },
          { path: 'predictors', component: PredictorDataComponent },
          { path: 'visualization', component: VisualizationComponent },
          { path: 'upload-data', component: UploadDataComponent },
          { path: '', pathMatch: 'full', redirectTo: 'energy-consumption' }
        ]
      },
      {
        path: 'analysis',
        component: AnalysisComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'analysis-dashboard' },
          { path: 'analysis-dashboard', component: AnalysisDashboardComponent },
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
                  { path: 'regression-model-selection', component: RegressionModelSelectionComponent },
                  { path: 'annual-analysis', component: AnnualAnalysisSummaryComponent },
                  { path: 'monthly-analysis', component: MonthlyAnalysisSummaryComponent }
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
              }
            ]
          }
        ]
      },
    ]
  },
  { path: 'about', component: AboutComponent },
  { path: 'acknowledgments', component: AcknowledgmentsComponent },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'help', component: HelpComponent },
  { path: 'style-guide', component: StyleGuideComponent },
  { path: "**", component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
