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
    AccountAnalysisInFacilityHelpComponent
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
