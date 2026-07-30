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
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { FacilityReportsDashboardTableComponent } from './facility-reports-dashboard/facility-reports-dashboard-table/facility-reports-dashboard-table.component';
import { TableItemsDropdownModule } from "src/app/shared/table-items-dropdown/table-items-dropdown.module";
import { NgbPagination } from "@ng-bootstrap/ng-bootstrap";
import { FacilityReportBadgeClassPipe } from './facility-report-pipes/facility-report-badge-class.pipe';
import { FacilityModelingReportSetupComponent } from './facility-report-setup/facility-modeling-report-setup/facility-modeling-report-setup.component';
import { FacilityModelingReportResultsComponent } from './report-results/facility-modeling-report-results/facility-modeling-report-results.component';
import { AccountReportsModule } from '../../account/account-reports/account-reports.module';
import { FacilityReportsDataCheckComponent } from './facility-reports-data-check/facility-reports-data-check.component';
import { FacilityReportAnalysisSelectionComponent } from './facility-report-setup/facility-report-analysis-selection/facility-report-analysis-selection.component';
import { FacilityCostSavingsReportSetupComponent } from './facility-report-setup/facility-cost-savings-report-setup/facility-cost-savings-report-setup.component';
import { BlendedEnergyRateModalComponent } from './facility-report-setup/facility-cost-savings-report-setup/blended-energy-rate-modal/blended-energy-rate-modal.component';
import { FacilityCostSavingsReportResultsComponent } from './report-results/facility-cost-savings-report-results/facility-cost-savings-report-results.component';
import { AnnualSavingsGraphComponent } from './report-results/facility-cost-savings-report-results/annual-savings-graph/annual-savings-graph.component';
import { FacilityDataQualityReportSetupComponent } from './facility-report-setup/facility-data-quality-report-setup/facility-data-quality-report-setup.component';
import { FacilityDataQualityReportResultsComponent } from './report-results/facility-data-quality-report-results/facility-data-quality-report-results.component';
import { SharedDataQualityReportMetersModule } from 'src/app/shared/shared-data-quality-report-meters/shared-data-quality-report-meters.module';
import { SharedDataQualityReportPredictorsModule } from 'src/app/shared/shared-data-quality-report-predictor/shared-data-quality-report-predictor.module';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';
import { MonthlySavingsTableComponent } from './report-results/facility-cost-savings-report-results/monthly-savings-table/monthly-savings-table.component';
import { GroupSavingsTableComponent } from './report-results/facility-cost-savings-report-results/group-savings-table/group-savings-table.component';
import { AnnualSavingsTableComponent } from './report-results/facility-cost-savings-report-results/annual-savings-table/annual-savings-table.component';
import { MonthlySavingsGraphComponent } from './report-results/facility-cost-savings-report-results/monthly-savings-graph/monthly-savings-graph.component';
import { RegressionNumberPipe } from 'src/app/shared/helper-pipes/regression-number.pipe';
import { UserDefineModelDateRangePipe } from 'src/app/shared/shared-analysis/data-check/regression-model-details-table/user-define-model-date-range.pipe';



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
    FacilitySavingsReportSetupComponent,
    FacilitySavingsReportResultsComponent,
    FacilityEmissionFactorsReportResultsComponent,
    FacilityEmissionFactorsReportSetupComponent,
    FacilityEmissionFactorsReportTableComponent,
    FacilityReportsDashboardTableComponent,
    FacilityReportBadgeClassPipe,
    FacilityModelingReportSetupComponent,
    FacilityModelingReportResultsComponent,
    FacilityReportsDataCheckComponent,
    FacilityReportAnalysisSelectionComponent,
    FacilityDataQualityReportSetupComponent,
    FacilityDataQualityReportResultsComponent,
    FacilityCostSavingsReportSetupComponent,
    BlendedEnergyRateModalComponent,
    FacilityCostSavingsReportResultsComponent,
    AnnualSavingsGraphComponent,
    MonthlySavingsTableComponent,
    GroupSavingsTableComponent,
    AnnualSavingsTableComponent,
    MonthlySavingsGraphComponent
    
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
    NgbPagination,
    SharedAnalysisModule,
    AccountReportsModule,
    SharedDataQualityReportMetersModule,
    SharedDataQualityReportPredictorsModule
], 
providers: [
    FacilityReportTypePipe,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    CustomNumberPipe,
    RegressionNumberPipe,
    UserDefineModelDateRangePipe
  ]
})
export class FacilityReportsModule { }
