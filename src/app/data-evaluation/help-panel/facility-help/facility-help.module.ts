import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHelpComponent } from './facility-help.component';
import { FacilityHomeHelpComponent } from './facility-home-help/facility-home-help.component';
import { FacilityOverviewHelpComponent } from './facility-overview-help/facility-overview-help.component';
import { FacilityVisualizationHelpComponent } from './facility-visualization-help/facility-visualization-help.component';
import { FacilityAnalysisHelpComponent } from './facility-analysis-help/facility-analysis-help.component';
import { FacilityAnalysisDashboardHelpComponent } from './facility-analysis-help/facility-analysis-dashboard-help/facility-analysis-dashboard-help.component';
import { FacilityAnalysisSetupHelpComponent } from './facility-analysis-help/facility-analysis-setup-help/facility-analysis-setup-help.component';
import { GroupAnalysisHelpComponent } from './facility-analysis-help/group-analysis-help/group-analysis-help.component';
import { FacilityAnalysisResultsHelpComponent } from './facility-analysis-help/facility-analysis-results-help/facility-analysis-results-help.component';
import { AccountAnalysisInFacilityHelpComponent } from './facility-analysis-help/account-analysis-in-facility-help/account-analysis-in-facility-help.component';
import { SharedHelpContentModule } from 'src/app/shared/shared-help-content/shared-help-content.module';
import { FacilityReportsHelpComponent } from './facility-reports-help/facility-reports-help.component';
import { FacilityReportSetupHelpComponent } from './facility-reports-help/facility-report-setup-help/facility-report-setup-help.component';
import { FacilityDataOverviewReportHelpComponent } from './facility-reports-help/facility-data-overview-report-help/facility-data-overview-report-help.component';
import { FacilityAnalysisReportHelpComponent } from './facility-reports-help/facility-analysis-report-help/facility-analysis-report-help.component';
import { FacilityReportDashboardHelpComponent } from './facility-reports-help/facility-report-dashboard-help/facility-report-dashboard-help.component';
import { FacilityEmissionsFactorsReportHelpComponent } from './facility-reports-help/facility-emissions-factors-report-help/facility-emissions-factors-report-help.component';



@NgModule({
  declarations: [
    FacilityHelpComponent,
    FacilityHomeHelpComponent,
    FacilityOverviewHelpComponent,
    FacilityVisualizationHelpComponent,
    FacilityAnalysisHelpComponent,
    FacilityAnalysisDashboardHelpComponent,
    FacilityAnalysisSetupHelpComponent,
    GroupAnalysisHelpComponent,
    FacilityAnalysisResultsHelpComponent,
    AccountAnalysisInFacilityHelpComponent,
    FacilityReportsHelpComponent,
    FacilityReportSetupHelpComponent,
    FacilityDataOverviewReportHelpComponent,
    FacilityAnalysisReportHelpComponent,
    FacilityReportDashboardHelpComponent,
    FacilityEmissionsFactorsReportHelpComponent
  ],
  imports: [
    CommonModule,
    SharedHelpContentModule
  ],
  exports: [
    FacilityHelpComponent
  ]
})
export class FacilityHelpModule { }
