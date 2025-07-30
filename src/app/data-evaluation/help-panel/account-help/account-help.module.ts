import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountHelpComponent } from './account-help.component';
import { AccountHomeHelpComponent } from './account-home-help/account-home-help.component';
import { AccountOverviewHelpComponent } from './account-overview-help/account-overview-help.component';
import { AccountReportsHelpComponent } from './account-reports-help/account-reports-help.component';
import { AccountAnalysisHelpComponent } from './account-analysis-help/account-analysis-help.component';
import { AccountCustomDataHelpComponent } from './account-custom-data-help/account-custom-data-help.component';
import { ReportsDashboardHelpComponent } from './account-reports-help/reports-dashboard-help/reports-dashboard-help.component';
import { ReportSetupHelpComponent } from './account-reports-help/report-setup-help/report-setup-help.component';
import { DataOverviewReportHelpComponent } from './account-reports-help/data-overview-report-help/data-overview-report-help.component';
import { BetterPlantsReportHelpComponent } from './account-reports-help/better-plants-report-help/better-plants-report-help.component';
import { AccountAnalysisDashboardHelpComponent } from './account-analysis-help/account-analysis-dashboard-help/account-analysis-dashboard-help.component';
import { AccountAnalysisSetupHelpComponent } from './account-analysis-help/account-analysis-setup-help/account-analysis-setup-help.component';
import { AccountAnalysisSelectItemsHelpComponent } from './account-analysis-help/account-analysis-select-items-help/account-analysis-select-items-help.component';
import { AccountAnalysisResultsHelpComponent } from './account-analysis-help/account-analysis-results-help/account-analysis-results-help.component';
import { SharedHelpContentModule } from 'src/app/shared/shared-help-content/shared-help-content.module';
import { AnalysisReportHelpComponent } from './account-reports-help/analysis-report-help/analysis-report-help.component';
import { BetterClimateReportHelpComponent } from './account-reports-help/better-climate-report-help/better-climate-report-help.component';



@NgModule({
  declarations: [
    AccountHelpComponent,
    AccountHomeHelpComponent,
    AccountOverviewHelpComponent,
    AccountReportsHelpComponent,
    AccountAnalysisHelpComponent,
    AccountCustomDataHelpComponent,
    ReportsDashboardHelpComponent,
    ReportSetupHelpComponent,
    DataOverviewReportHelpComponent,
    BetterPlantsReportHelpComponent,
    AccountAnalysisDashboardHelpComponent,
    AccountAnalysisSetupHelpComponent,
    AccountAnalysisSelectItemsHelpComponent,
    AccountAnalysisResultsHelpComponent,
    AnalysisReportHelpComponent,
    BetterClimateReportHelpComponent
  ],
  imports: [
    CommonModule,
    SharedHelpContentModule
  ],
  exports: [
    AccountHelpComponent
  ]
})
export class AccountHelpModule { }
