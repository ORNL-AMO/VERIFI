import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccountComponent } from './account-management/account/account.component';
import { FacilityComponent } from './account-management/facility/facility.component';
import { EnergyConsumptionComponent } from './utility-data/energy-consumption/energy-consumption.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EnergySourceComponent } from './utility-data/energy-consumption/energy-source/energy-source.component';
import { StyleGuideComponent } from './static-content/style-guide/style-guide.component';
import { UtilityMeterDataComponent } from './utility-data/energy-consumption/utility-meter-data/utility-meter-data.component';
import { MeterGroupingComponent } from './utility-data/meter-grouping/meter-grouping.component';
import { PredictorDataComponent } from './utility-data/predictor-data/predictor-data.component';
import { CalanderizationComponent } from './utility-data/calanderization/calanderization.component';
import { VisualizationComponent } from './utility-data/visualization/visualization.component';
import { FacilityOverviewComponent } from './dashboard/facility-overview/facility-overview.component';
import { AccountOverviewComponent } from './dashboard/account-overview/account-overview.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AboutComponent } from './static-content/about/about.component';
import { AcknowledgmentsComponent } from './static-content/acknowledgments/acknowledgments.component';
import { FeedbackComponent } from './static-content/feedback/feedback.component';
import { HelpComponent } from './static-content/help/help.component';
import { UploadDataComponent } from './utility-data/upload-data/upload-data.component';
import { OverviewReportComponent } from './overview-report/overview-report.component';
import { OverviewReportDashboardComponent } from './overview-report/overview-report-dashboard/overview-report-dashboard.component';
import { OverviewReportMenuComponent } from './overview-report/overview-report-menu/overview-report-menu.component';
import { BasicReportComponent } from './overview-report/basic-report/basic-report.component';
import { UtilityDataComponent } from './utility-data/utility-data.component';
import { AnalysisComponent } from './analysis/analysis.component';
import { AnalysisDashboardComponent } from './analysis/analysis-dashboard/analysis-dashboard.component';
import { RunAnalysisComponent } from './analysis/run-analysis/run-analysis.component';
import { AnalysisSetupComponent } from './analysis/run-analysis/analysis-setup/analysis-setup.component';
import { GroupAnalysisComponent } from './analysis/run-analysis/group-analysis/group-analysis.component';
import { GroupAnalysisOptionsComponent } from './analysis/run-analysis/group-analysis/group-analysis-options/group-analysis-options.component';
import { GroupAnnualEnergyIntensityComponent } from './analysis/run-analysis/group-analysis/group-annual-energy-intensity/group-annual-energy-intensity.component';
import { GroupMonthlyEnergyIntensityComponent } from './analysis/run-analysis/group-analysis/group-monthly-energy-intensity/group-monthly-energy-intensity.component';
import { FacilityAnalysisComponent } from './analysis/run-analysis/facility-analysis/facility-analysis.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    component: DashboardComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'account-summary'
      },
      {
        path: 'account-summary',
        component: AccountOverviewComponent,
      },
      {
        path: 'facility-summary',
        component: FacilityOverviewComponent,
      }
    ]
  },
  {
    path: 'account-management',
    component: AccountComponent
  },
  {
    path: 'facility-management',
    component: FacilityComponent
  },
  {
    path: 'utility',
    component: UtilityDataComponent,
    children: [
      {
        path: 'energy-consumption', component: EnergyConsumptionComponent,
        children: [
          { path: '', component: EnergySourceComponent },
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
  { path: 'about', component: AboutComponent },
  { path: 'acknowledgments', component: AcknowledgmentsComponent },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'help', component: HelpComponent },
  { path: 'style-guide', component: StyleGuideComponent },
  {
    path: 'overview-report',
    component: OverviewReportComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'report-dashboard' },
      { path: 'report-dashboard', component: OverviewReportDashboardComponent },
      { path: 'report-menu', component: OverviewReportMenuComponent },
      { path: 'basic-report', component: BasicReportComponent }
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
              { path: 'annual-energy-intensity', component: GroupAnnualEnergyIntensityComponent },
              { path: 'monthly-energy-intensity', component: GroupMonthlyEnergyIntensityComponent }
            ]
          },
          {
            path: 'facility-analysis',
            component: FacilityAnalysisComponent
          }
        ]
      }
    ]
  },
  { path: "**", component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
