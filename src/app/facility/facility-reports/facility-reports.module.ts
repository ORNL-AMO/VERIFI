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
import { FacilityOverviewReportSetupComponent } from './facility-report-setup/facility-overview-report-setup/facility-overview-report-setup.component';
import { FacilityOverviewReportResultsComponent } from './report-results/facility-overview-report-results/facility-overview-report-results.component';
import { FacilityAnalysisReportResultsComponent } from './report-results/facility-analysis-report-results/facility-analysis-report-results.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';



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
    FacilityOverviewReportSetupComponent,
    FacilityOverviewReportResultsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedReportsModule,
    HelperPipesModule,
    DataOverviewModule,
    CalculatingSpinnerModule
  ]
})
export class FacilityReportsModule { }
