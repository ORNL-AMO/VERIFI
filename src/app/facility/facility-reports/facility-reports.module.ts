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
import { FacilityAnalysisReportResultsComponent } from './facility-analysis-report-results/facility-analysis-report-results.component';
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
    SepReportGraphsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedReportsModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule
  ]
})
export class FacilityReportsModule { }
