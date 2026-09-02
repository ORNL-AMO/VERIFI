import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-help.component';
import { AccountHomeHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-home-help/account-home-help.component';
import { AccountOverviewHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-overview-help/account-overview-help.component';
import { AccountReportsHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/account-reports-help.component';
import { AccountAnalysisHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-analysis-help/account-analysis-help.component';
import { AccountCustomDataHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-custom-data-help/account-custom-data-help.component';
import { ReportsDashboardHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/reports-dashboard-help/reports-dashboard-help.component';
import { ReportSetupHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/report-setup-help/report-setup-help.component';
import { DataOverviewReportHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/data-overview-report-help/data-overview-report-help.component';
import { BetterPlantsReportHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/better-plants-report-help/better-plants-report-help.component';
import { AccountAnalysisDashboardHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-analysis-help/account-analysis-dashboard-help/account-analysis-dashboard-help.component';
import { AccountAnalysisSetupHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-analysis-help/account-analysis-setup-help/account-analysis-setup-help.component';
import { AccountAnalysisSelectItemsHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-analysis-help/account-analysis-select-items-help/account-analysis-select-items-help.component';
import { AccountAnalysisResultsHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-analysis-help/account-analysis-results-help/account-analysis-results-help.component';
import { SharedHelpContentModule } from '@v0/shared/shared-help-content/shared-help-content.module';
import { AnalysisReportHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/analysis-report-help/analysis-report-help.component';
import { BetterClimateReportHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/better-climate-report-help/better-climate-report-help.component';
import { EmissionsFactorsReportHelpComponent } from '@v0/data-evaluation/help-panel/account-help/account-reports-help/emissions-factors-report-help/emissions-factors-report-help.component';



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
    BetterClimateReportHelpComponent,
    EmissionsFactorsReportHelpComponent
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
