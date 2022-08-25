import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EnergyConsumptionComponent } from './facility/utility-data/energy-consumption/energy-consumption.component';
import { EnergySourceComponent } from './facility/utility-data/energy-consumption/energy-source/energy-source.component';
import { StyleGuideComponent } from './static-content/style-guide/style-guide.component';
import { UtilityMeterDataComponent } from './facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.component';
import { MeterGroupingComponent } from './facility/utility-data/meter-grouping/meter-grouping.component';
import { PredictorDataComponent } from './facility/utility-data/predictor-data/predictor-data.component';
import { CalanderizationComponent } from './facility/utility-data/calanderization/calanderization.component';
import { VisualizationComponent } from './facility/visualization/visualization.component';
import { PageNotFoundComponent } from './core-components/page-not-found/page-not-found.component';
import { AboutComponent } from './static-content/about/about.component';
import { AcknowledgmentsComponent } from './static-content/acknowledgments/acknowledgments.component';
import { FeedbackComponent } from './static-content/feedback/feedback.component';
import { HelpComponent } from './static-content/help/help.component';
// import { UploadDataComponent } from './facility/utility-data/upload-data/upload-data.component';
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
import { SetupWizardComponent } from './setup-wizard/setup-wizard.component';
import { SetupWelcomeComponent } from './setup-wizard/setup-welcome/setup-welcome.component';
import { SetupAccountComponent } from './setup-wizard/setup-account/setup-account.component';
import { SetupFacilitiesComponent } from './setup-wizard/setup-facilities/setup-facilities.component';
import { SetupConfirmationComponent } from './setup-wizard/setup-confirmation/setup-confirmation.component';
import { AccountAnalysisComponent } from './account/account-analysis/account-analysis.component';
import { AccountAnalysisDashboardComponent } from './account/account-analysis/account-analysis-dashboard/account-analysis-dashboard.component';
import { AccountAnalysisSetupComponent } from './account/account-analysis/account-analysis-setup/account-analysis-setup.component';
import { SelectFacilityAnalysisItemsComponent } from './account/account-analysis/select-facility-analysis-items/select-facility-analysis-items.component';
import { AccountAnalysisResultsComponent } from './account/account-analysis/account-analysis-results/account-analysis-results.component';
import { MonthlyAccountAnalysisComponent } from './account/account-analysis/account-analysis-results/monthly-account-analysis/monthly-account-analysis.component';
import { AnnualAccountAnalysisComponent } from './account/account-analysis/account-analysis-results/annual-account-analysis/annual-account-analysis.component';
import { BetterPlantsReportMenuComponent } from './account/overview-report/better-plants-report-menu/better-plants-report-menu.component';
import { BetterPlantsReportComponent } from './account/overview-report/better-plants-report/better-plants-report.component';
import { EditMeterComponent } from './facility/utility-data/energy-consumption/energy-source/edit-meter/edit-meter.component';
import { UtilityMetersTableComponent } from './facility/utility-data/energy-consumption/energy-source/utility-meters-table/utility-meters-table.component';
import { UtilityMeterDataTableComponent } from './facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data-table/utility-meter-data-table.component';
import { EditBillComponent } from './facility/utility-data/energy-consumption/utility-meter-data/edit-bill/edit-bill.component';
import { AccountHomeComponent } from './account/account-home/account-home.component';
import { FacilityHomeComponent } from './facility/facility-home/facility-home.component';
import { CustomDatabaseComponent } from './account/custom-database/custom-database.component';
import { RegionalEmissionsDataComponent } from './account/custom-database/regional-emissions-data/regional-emissions-data.component';
import { EmissionsDataDashboardComponent } from './account/custom-database/regional-emissions-data/emissions-data-dashboard/emissions-data-dashboard.component';
import { EmissionsDataFormComponent } from './account/custom-database/regional-emissions-data/emissions-data-form/emissions-data-form.component';
import { UploadDataComponent } from './upload-data/upload-data.component';
import { FileUploadComponent } from './upload-data/file-upload/file-upload.component';
import { DataSetupComponent } from './upload-data/data-setup/data-setup.component';
import { FileSetupComponent } from './upload-data/data-setup/file-setup/file-setup.component';
import { SelectWorksheetComponent } from './upload-data/data-setup/file-setup/select-worksheet/select-worksheet.component';
import { IdentifyColumnsComponent } from './upload-data/data-setup/file-setup/identify-columns/identify-columns.component';
import { ManageMetersComponent } from './upload-data/data-setup/manage-meters/manage-meters.component';
import { SetFacilityMetersComponent } from './upload-data/data-setup/set-facility-meters/set-facility-meters.component';
import { SetFacilityPredictorsComponent } from './upload-data/data-setup/set-facility-predictors/set-facility-predictors.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'account'
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
        component: AccountHomeComponent
      },
      {
        path: 'overview',
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
          { path: 'basic-report', component: BasicReportComponent },
          { path: 'better-plants-menu', component: BetterPlantsReportMenuComponent },
          { path: 'better-plants-report', component: BetterPlantsReportComponent }
        ]
      },
      {
        path: 'analysis',
        component: AccountAnalysisComponent,
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          { path: 'dashboard', component: AccountAnalysisDashboardComponent },
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
        component: FacilityHomeComponent
      },
      {
        path: 'overview',
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
                    component: EditMeterComponent
                  },
                  {
                    path: 'new-meter',
                    component: EditMeterComponent
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
                    component: UtilityMeterDataTableComponent
                  },
                  {
                    path: 'edit-bill/:id',
                    component: EditBillComponent
                  },
                  {
                    path: 'new-bill',
                    component: EditBillComponent
                  }
                ]
              },
            ],
          },
          { path: 'monthly-meter-data', component: CalanderizationComponent },
          { path: 'meter-groups', component: MeterGroupingComponent },
          { path: 'predictors', component: PredictorDataComponent },
          // { path: 'upload-data', component: UploadDataComponent },
          { path: '', pathMatch: 'full', redirectTo: 'energy-consumption' }
        ]
      },
      { path: 'visualization', component: VisualizationComponent },
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
                  { path: 'model-selection', component: RegressionModelSelectionComponent },
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
  {
    path: 'setup-wizard',
    component: SetupWizardComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'welcome' },
      { path: 'welcome', component: SetupWelcomeComponent },
      { path: 'account-setup', component: SetupAccountComponent },
      { path: 'facility-setup', component: SetupFacilitiesComponent },
      { path: 'confirmation', component: SetupConfirmationComponent },

    ]
  },
  { path: 'about', component: AboutComponent },
  { path: 'acknowledgments', component: AcknowledgmentsComponent },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'help', component: HelpComponent },
  { path: 'style-guide', component: StyleGuideComponent },
  {
    path: 'upload',
    component: UploadDataComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'file-upload' },
      { path: 'file-upload', component: FileUploadComponent },
      {
        path: 'data-setup',
        component: DataSetupComponent,
        children: [
          { 
            path: 'file-setup/:id', 
            component: FileSetupComponent,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'select-worksheet' },
              { path: 'select-worksheet', component: SelectWorksheetComponent },
              { path: 'identify-columns', component: IdentifyColumnsComponent }
            ]
          },
          { path: 'manage-meters', component: ManageMetersComponent },
          { path: 'set-facility-meters', component: SetFacilityMetersComponent },
          { path: 'set-facility-predictors', component: SetFacilityPredictorsComponent },
        ]
      },

    ]
  },
  //wildcard/page not found needs to be last route
  { path: "**", component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
