import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BasicReportHelpComponent } from './overview-report/basic-report-help/basic-report-help.component';
import { OverviewReportDashboardHelpComponent } from './overview-report/overview-report-dashboard-help/overview-report-dashboard-help.component';
import { OverviewReportMenuHelpComponent } from './overview-report/overview-report-menu-help/overview-report-menu-help.component';
import { AnalysisSetupHelpComponent } from './analysis/analysis-setup-help/analysis-setup-help.component';
import { FacilityAnalysisHelpComponent } from './analysis/facility-analysis-help/facility-analysis-help.component';
import { MonthlyGroupAnalysisHelpComponent } from './analysis/monthly-group-analysis-help/monthly-group-analysis-help.component';
import { AnnualGroupAnalysisHelpComponent } from './analysis/annual-group-analysis-help/annual-group-analysis-help.component';
import { GroupAnalysisSetupHelpComponent } from './analysis/group-analysis-setup-help/group-analysis-setup-help.component';
import { EnergyConsumptionHelpComponent } from './utility/energy-consumption-help/energy-consumption-help.component';
import { AccountOverviewHelpComponent } from './dashboard/account-overview-help/account-overview-help.component';
import { FacilityOverviewHelpComponent } from './dashboard/facility-overview-help/facility-overview-help.component';
import { MeterGroupingHelpComponent } from './utility/meter-grouping-help/meter-grouping-help.component';
import { CalanderizationHelpComponent } from './utility/calanderization-help/calanderization-help.component';
import { PredictorsDataHelpComponent } from './utility/predictors-data-help/predictors-data-help.component';
import { VisualizationHelpComponent } from './utility/visualization-help/visualization-help.component';
import { AccountHelpComponent } from './account-management/account-help/account-help.component';
import { FacilityHelpComponent } from './account-management/facility-help/facility-help.component';
import { HelpPanelComponent } from './help-panel.component';
import { AnalysisDashboardHelpComponent } from './analysis/analysis-dashboard-help/analysis-dashboard-help.component';
import { HelpPageComponent } from './help-page/help-page.component';
import { AccountAnalysisDashboardHelpComponent } from './analysis/account-analysis-dashboard-help/account-analysis-dashboard-help.component';
import { AccountAnalysisSetupHelpComponent } from './analysis/account-analysis-setup-help/account-analysis-setup-help.component';
import { UploadDataHelpModule } from './upload-data-help/upload-data-help.module';
import { SetupWizardHelpModule } from './setup-wizard-help/setup-wizard-help.module';
@NgModule({
  declarations: [
    BasicReportHelpComponent,
    OverviewReportDashboardHelpComponent,
    OverviewReportMenuHelpComponent,
    AnalysisSetupHelpComponent,
    FacilityAnalysisHelpComponent,
    MonthlyGroupAnalysisHelpComponent,
    AnnualGroupAnalysisHelpComponent,
    GroupAnalysisSetupHelpComponent,
    EnergyConsumptionHelpComponent,
    AccountOverviewHelpComponent,
    FacilityOverviewHelpComponent,
    MeterGroupingHelpComponent,
    CalanderizationHelpComponent,
    PredictorsDataHelpComponent,
    VisualizationHelpComponent,
    AccountHelpComponent,
    FacilityHelpComponent,
    HelpPanelComponent,
    AnalysisDashboardHelpComponent,
    HelpPageComponent,
    AccountAnalysisDashboardHelpComponent,
    AccountAnalysisSetupHelpComponent,
  ],
  imports: [
    CommonModule,
    UploadDataHelpModule,
    SetupWizardHelpModule
  ],
  exports: [
    HelpPanelComponent
  ]
})
export class HelpPanelModule { }
