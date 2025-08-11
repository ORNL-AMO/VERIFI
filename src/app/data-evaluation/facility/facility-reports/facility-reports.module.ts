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
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { FacilityOverviewReportSetupComponent } from './facility-report-setup/facility-overview-report-setup/facility-overview-report-setup.component';
import { FacilityOverviewReportResultsComponent } from './report-results/facility-overview-report-results/facility-overview-report-results.component';
import { FacilityAnalysisReportResultsComponent } from './report-results/facility-analysis-report-results/facility-analysis-report-results.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { FacilityEmissionFactorsReportResultsComponent } from './report-results/facility-emission-factors-report-results/facility-emission-factors-report-results.component';
import { FacilityEmissionFactorsReportSetupComponent } from './facility-report-setup/facility-emission-factors-report-setup/facility-emission-factors-report-setup.component';
import { FacilityEmissionFactorsReportTableComponent } from './report-results/facility-emission-factors-report-results/facility-emission-factors-report-table/facility-emission-factors-report-table.component';
import { FacilitySavingsReportResultsComponent } from 'src/app/data-evaluation/facility/facility-reports/report-results/facility-savings-report-results/facility-savings-report-results.component';
import { FacilitySavingsReportSetupComponent } from 'src/app/data-evaluation/facility/facility-reports/facility-report-setup/facility-savings-report-setup/facility-savings-report-setup.component';
import { FacilitySavingsReportsDashboardComponent } from 'src/app/data-evaluation/facility/facility-reports/facility-reports-dashboard/facility-savings-reports-dashboard/facility-savings-reports-dashboard.component';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { FacilityReportsDashboardTableComponent } from './facility-reports-dashboard/facility-reports-dashboard-table/facility-reports-dashboard-table.component';
import { TableItemsDropdownModule } from "src/app/shared/table-items-dropdown/table-items-dropdown.module";
import { NgbPagination } from "@ng-bootstrap/ng-bootstrap";
import { FacilityReportOrderByPipe } from './facility-report-pipes/facility-report-order-by.pipe';



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
    FacilityOverviewReportSetupComponent,
    FacilityOverviewReportResultsComponent,
    FacilityReportsDashboardTabsComponent,
    FacilityAnalysisReportsDashboardComponent,
    FacilityOverviewReportsDashboardComponent,
    FacilitySavingsReportsDashboardComponent,
    FacilitySavingsReportSetupComponent,
    FacilitySavingsReportResultsComponent,
    FacilityEmissionsFactorsReportsDashboardComponent,
    FacilityEmissionFactorsReportResultsComponent,
    FacilityEmissionFactorsReportSetupComponent,
    FacilityEmissionFactorsReportTableComponent,
    FacilityReportsDashboardTableComponent,
    FacilityReportOrderByPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedReportsModule,
    HelperPipesModule,
    DataOverviewModule,
    CalculatingSpinnerModule,
    TableItemsDropdownModule,
    NgbPagination
], 
providers: [
    FacilityReportTypePipe,
    CalculatingSpinnerModule,
    SharedAnalysisModule
  ]
})
export class FacilityReportsModule { }
