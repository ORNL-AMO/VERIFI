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
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { FacilityOverviewReportSetupComponent } from './facility-report-setup/facility-overview-report-setup/facility-overview-report-setup.component';
import { FacilityOverviewReportResultsComponent } from './report-results/facility-overview-report-results/facility-overview-report-results.component';
import { FacilityAnalysisReportResultsComponent } from './report-results/facility-analysis-report-results/facility-analysis-report-results.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { FacilityReportsDashboardTabsComponent } from './facility-reports-dashboard/facility-reports-dashboard-tabs/facility-reports-dashboard-tabs.component';
import { FacilityAnalysisReportsDashboardComponent } from './facility-reports-dashboard/facility-analysis-reports-dashboard/facility-analysis-reports-dashboard.component';
import { FacilityOverviewReportsDashboardComponent } from './facility-reports-dashboard/facility-overview-reports-dashboard/facility-overview-reports-dashboard.component';
import { FacilityEmissionsFactorsReportsDashboardComponent } from './facility-reports-dashboard/facility-emissions-factors-reports-dashboard/facility-emissions-factors-reports-dashboard.component';
import { FacilityEmissionFactorsReportResultsComponent } from './report-results/facility-emission-factors-report-results/facility-emission-factors-report-results.component';
import { FacilityEmissionFactorsReportSetupComponent } from './facility-report-setup/facility-emission-factors-report-setup/facility-emission-factors-report-setup.component';
import { FacilityEmissionFactorsReportTableComponent } from './report-results/facility-emission-factors-report-results/facility-emission-factors-report-table/facility-emission-factors-report-table.component';



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
    FacilityOverviewReportResultsComponent,
    FacilityReportsDashboardTabsComponent,
    FacilityAnalysisReportsDashboardComponent,
    FacilityOverviewReportsDashboardComponent,
    FacilityEmissionsFactorsReportsDashboardComponent,
    FacilityEmissionFactorsReportResultsComponent,
    FacilityEmissionFactorsReportSetupComponent,
    FacilityEmissionFactorsReportTableComponent
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
