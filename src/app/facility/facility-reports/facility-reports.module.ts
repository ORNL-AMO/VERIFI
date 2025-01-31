import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityReportsComponent } from './facility-reports.component';
import { FacilityReportsDashboardComponent } from './facility-reports-dashboard/facility-reports-dashboard.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FacilityReportsTabsComponent } from './facility-reports-tabs/facility-reports-tabs.component';
import { FacilityReportSetupComponent } from './facility-report-setup/facility-report-setup.component';
import { FacilityReportTypePipe } from './facility-report-pipes/facility-report-type.pipe';
import { FacilityAnalysisReportSetupComponent } from './facility-report-setup/facility-analysis-report-setup/facility-analysis-report-setup.component';
import { SharedReportsModule } from 'src/app/shared/shared-reports/shared-reports.module';
import { FacilityPrintReportButtonComponent } from './facility-print-report-button/facility-print-report-button.component';
import { FacilityReportItemCardComponent } from './facility-reports-dashboard/facility-report-item-card/facility-report-item-card.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { FacilitySepReportResultsComponent } from './facility-sep-report-results/facility-sep-report-results.component';
import { FacilitySepReportSetupComponent } from './facility-report-setup/facility-sep-report-setup/facility-sep-report-setup.component';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { SepResultsTableComponent } from './facility-sep-report-results/sep-results-table/sep-results-table.component';
import { SepFacilityInformationTableComponent } from './facility-sep-report-results/sep-facility-information-table/sep-facility-information-table.component';
import { SepReportGraphsComponent } from './facility-sep-report-results/sep-report-graphs/sep-report-graphs.component';
import { FacilityOverviewReportSetupComponent } from './facility-report-setup/facility-overview-report-setup/facility-overview-report-setup.component';
import { FacilityOverviewReportResultsComponent } from './report-results/facility-overview-report-results/facility-overview-report-results.component';
import { FacilityAnalysisReportResultsComponent } from './report-results/facility-analysis-report-results/facility-analysis-report-results.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';
import { FacilityReportsDashboardTabsComponent } from './facility-reports-dashboard/facility-reports-dashboard-tabs/facility-reports-dashboard-tabs.component';
import { FacilityAnalysisReportsDashboardComponent } from './facility-reports-dashboard/facility-analysis-reports-dashboard/facility-analysis-reports-dashboard.component';
import { FacilityOverviewReportsDashboardComponent } from './facility-reports-dashboard/facility-overview-reports-dashboard/facility-overview-reports-dashboard.component';
import { FacilitySepReportsDashboardComponent } from './facility-reports-dashboard/facility-sep-reports-dashboard/facility-sep-reports-dashboard.component';



@NgModule({
  declarations: [
    FacilityReportsComponent,
    FacilityReportsDashboardComponent,
    FacilityReportsTabsComponent,
    FacilityReportSetupComponent,
    FacilityReportTypePipe,
    FacilityAnalysisReportSetupComponent,
    FacilityAnalysisReportResultsComponent,
    FacilityPrintReportButtonComponent,
    FacilityReportItemCardComponent,
    FacilitySepReportResultsComponent,
    FacilitySepReportSetupComponent,
    SepResultsTableComponent,
    SepFacilityInformationTableComponent,
    SepReportGraphsComponent,
    FacilityOverviewReportSetupComponent,
    FacilityOverviewReportResultsComponent,
    FacilityReportsDashboardTabsComponent,
    FacilityAnalysisReportsDashboardComponent,
    FacilityOverviewReportsDashboardComponent,
    FacilitySepReportsDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedReportsModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    DataOverviewModule,
    CalculatingSpinnerModule
  ]
})
export class FacilityReportsModule { }
