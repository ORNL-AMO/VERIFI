import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-help.component';
import { FacilityHomeHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-home-help/facility-home-help.component';
import { FacilityOverviewHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-overview-help/facility-overview-help.component';
import { FacilityVisualizationHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-visualization-help/facility-visualization-help.component';
import { FacilityAnalysisHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-analysis-help/facility-analysis-help.component';
import { FacilityAnalysisDashboardHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-analysis-help/facility-analysis-dashboard-help/facility-analysis-dashboard-help.component';
import { FacilityAnalysisSetupHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-analysis-help/facility-analysis-setup-help/facility-analysis-setup-help.component';
import { GroupAnalysisHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-analysis-help/group-analysis-help/group-analysis-help.component';
import { FacilityAnalysisResultsHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-analysis-help/facility-analysis-results-help/facility-analysis-results-help.component';
import { AccountAnalysisInFacilityHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-analysis-help/account-analysis-in-facility-help/account-analysis-in-facility-help.component';
import { SharedHelpContentModule } from '@app/shared/shared-help-content/shared-help-content.module';
import { FacilityReportsHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-reports-help/facility-reports-help.component';
import { FacilityReportSetupHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-reports-help/facility-report-setup-help/facility-report-setup-help.component';
import { FacilityDataOverviewReportHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-reports-help/facility-data-overview-report-help/facility-data-overview-report-help.component';
import { FacilityAnalysisReportHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-reports-help/facility-analysis-report-help/facility-analysis-report-help.component';
import { FacilityReportDashboardHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-reports-help/facility-report-dashboard-help/facility-report-dashboard-help.component';
import { FacilityEmissionsFactorsReportHelpComponent } from '@v0/data-evaluation/help-panel/facility-help/facility-reports-help/facility-emissions-factors-report-help/facility-emissions-factors-report-help.component';



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
