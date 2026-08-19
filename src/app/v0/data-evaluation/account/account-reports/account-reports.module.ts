import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountReportsComponent } from '@v0/data-evaluation/account/account-reports/account-reports.component';
import { AccountReportsBannerComponent } from '@v0/data-evaluation/account/account-reports/account-reports-banner/account-reports-banner.component';
import { RouterModule } from '@angular/router';
import { AccountReportsDashboardComponent } from '@v0/data-evaluation/account/account-reports/account-reports-dashboard/account-reports-dashboard.component';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { AccountReportSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/account-report-setup.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BetterPlantsSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/better-plants-setup/better-plants-setup.component';
import { DataOverviewSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/data-overview-setup/data-overview-setup.component';
import { LabelWithTooltipModule } from '@shared/label-with-tooltip/label-with-tooltip.module';
import { BetterPlantsReportComponent } from '@v0/data-evaluation/account/account-reports/better-plants-report/better-plants-report.component';
import { PrimaryEnergyConsumptionTableComponent } from '@v0/data-evaluation/account/account-reports/better-plants-report/primary-energy-consumption-table/primary-energy-consumption-table.component';
import { FacilityPerformanceTableComponent } from '@v0/data-evaluation/account/account-reports/better-plants-report/facility-performance-table/facility-performance-table.component';
import { CompanyInformationTableComponent } from '@v0/data-evaluation/account/account-reports/better-plants-report/company-information-table/company-information-table.component';
import { CalculatingSpinnerModule } from '@shared/calculating-spinner/calculating-spinner.module';
import { DataOverviewReportComponent } from '@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-report.component';
import { AccountTitlePageComponent } from '@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-account-report/account-title-page/account-title-page.component';
import { DataOverviewModule } from '@v0/shared/data-overview/data-overview.module';
import { AccountSectionReportComponent } from '@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-account-report/account-section-report/account-section-report.component';
import { FacilityTitlePageComponent } from '@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-facility-report/facility-title-page/facility-title-page.component';
import { DataOverviewAccountReportComponent } from '@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-account-report/data-overview-account-report.component';
import { DataOverviewFacilityReportComponent } from '@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-facility-report/data-overview-facility-report.component';
import { PrintReportButtonComponent } from '@v0/data-evaluation/account/account-reports/print-report-button/print-report-button.component';
import { PrimaryWaterConsumptionTableComponent } from '@v0/data-evaluation/account/account-reports/better-plants-report/primary-water-consumption-table/primary-water-consumption-table.component';
import { PerformanceReportComponent } from '@v0/data-evaluation/account/account-reports/performance-report/performance-report.component';
import { PerformanceSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/performance-setup/performance-setup.component';
import { PerformanceReportFacilityTableComponent } from '@v0/data-evaluation/account/account-reports/performance-report/performance-report-facility-table/performance-report-facility-table.component';
import { PerformanceReportGroupTableComponent } from '@v0/data-evaluation/account/account-reports/performance-report/performance-report-group-table/performance-report-group-table.component';
import { PerformanceReportUtilityTableComponent } from '@v0/data-evaluation/account/account-reports/performance-report/performance-report-utility-table/performance-report-utility-table.component';
import { PerformanceChartComponent } from '@v0/data-evaluation/account/account-reports/performance-report/performance-chart/performance-chart.component';
import { TopPerformersTableComponent } from '@v0/data-evaluation/account/account-reports/performance-report/top-performers-table/top-performers-table.component';
import { TableCellShadingPipe } from '@v0/data-evaluation/account/account-reports/report-pipes/table-cell-shading.pipe';
import { TableFillPipe } from '@v0/data-evaluation/account/account-reports/report-pipes/table-fill.pipe';
import { BetterClimateReportComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/better-climate-report.component';
import { BetterClimateSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/better-climate-setup/better-climate-setup.component';
import { PortfolioInformationTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/portfolio-information-table/portfolio-information-table.component';
import { AbsoluteEmissionsTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/absolute-emissions-table/absolute-emissions-table.component';
import { EmissionsReductionsTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/emissions-reductions-table/emissions-reductions-table.component';
import { TotalPortfolioEnergyUseTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/total-portfolio-energy-use-table/total-portfolio-energy-use-table.component';
import { VehicleEnergyUseTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/vehicle-energy-use-table/vehicle-energy-use-table.component';
import { GraphCalculationsTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/graph-calculations-table/graph-calculations-table.component';
import { AnnualFacilityClimateSummaryTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/annual-facility-climate-summary-table/annual-facility-climate-summary-table.component';
import { EmissionsReductionsChartComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/emissions-reductions-chart/emissions-reductions-chart.component';
import { AbsoluteEmissionsChartComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/absolute-emissions-chart/absolute-emissions-chart.component';
import { TopEmissionsPerformersTableComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/top-emissions-performers-table/top-emissions-performers-table.component';
import { TopPerformersChartComponent } from '@v0/data-evaluation/account/account-reports/better-climate-report/top-performers-chart/top-performers-chart.component';
import { AccountReportTypePipe } from '@v0/data-evaluation/account/account-reports/report-pipes/account-report-type.pipe';
import { AnalysisReportComponent } from '@v0/data-evaluation/account/account-reports/analysis-report/analysis-report.component';
import { AnalysisReportSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/analysis-report-setup/analysis-report-setup.component';
import { SharedAnalysisModule } from "@shared/shared-analysis/shared-analysis.module";
import { AccountEmissionFactorsReportComponent } from '@v0/data-evaluation/account/account-reports/account-emission-factors-report/account-emission-factors-report/account-emission-factors-report.component';
import { AccountEmissionFactorsReportTableComponent } from '@v0/data-evaluation/account/account-reports/account-emission-factors-report/account-emission-factors-report-table/account-emission-factors-report-table.component';
import { AccountSavingsReportSetupComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/account-savings-report-setup/account-savings-report-setup.component';
import { AccountSavingsReportComponent } from '@v0/data-evaluation/account/account-reports/account-savings-report/account-savings-report.component';
import { AccountReportsDashboardTableComponent } from '@v0/data-evaluation/account/account-reports/account-reports-dashboard/account-reports-dashboard-table/account-reports-dashboard-table.component';
import { ReportOrderByPipe } from '@v0/data-evaluation/account/account-reports/report-pipes/report-order-by.pipe';
import { NgbPagination } from "@ng-bootstrap/ng-bootstrap";
import { TableItemsDropdownModule } from "@shared/table-items-dropdown/table-items-dropdown.module";
import { ReportBadgeClassPipe } from '@v0/data-evaluation/account/account-reports/report-pipes/report-badge-class.pipe';
import { SharedReportsModule } from "@v0/shared/shared-reports/shared-reports.module";
import { AccountReportsDataCheckComponent } from '@v0/data-evaluation/account/account-reports/account-reports-data-check/account-reports-data-check.component';
import { AccountReportAnalysisSelectionComponent } from '@v0/data-evaluation/account/account-reports/account-report-setup/account-report-analysis-selection/account-report-analysis-selection.component';
import { CustomNumberPipe } from '@shared/helper-pipes/custom-number.pipe';
import { NaicsDisplayPipe } from '@shared/helper-pipes/naics-display.pipe';

@NgModule({
  declarations: [
    AccountReportsComponent,
    AccountReportsBannerComponent,
    AccountReportsDashboardComponent,
    AccountReportSetupComponent,
    BetterPlantsSetupComponent,
    DataOverviewSetupComponent,
    BetterPlantsReportComponent,
    PrimaryEnergyConsumptionTableComponent,
    FacilityPerformanceTableComponent,
    CompanyInformationTableComponent,
    DataOverviewReportComponent,
    AccountTitlePageComponent,
    AccountSectionReportComponent,
    FacilityTitlePageComponent,
    DataOverviewAccountReportComponent,
    DataOverviewFacilityReportComponent,
    PrintReportButtonComponent,
    PrimaryWaterConsumptionTableComponent,
    PerformanceReportComponent,
    PerformanceSetupComponent,
    FacilityPerformanceTableComponent,
    PerformanceReportFacilityTableComponent,
    TableCellShadingPipe,
    TableFillPipe,
    PerformanceReportGroupTableComponent,
    PerformanceReportUtilityTableComponent,
    PerformanceChartComponent,
    TopPerformersTableComponent,
    BetterClimateReportComponent,
    BetterClimateSetupComponent,
    PortfolioInformationTableComponent,
    AbsoluteEmissionsTableComponent,
    EmissionsReductionsTableComponent,
    TotalPortfolioEnergyUseTableComponent,
    VehicleEnergyUseTableComponent,
    GraphCalculationsTableComponent,
    AnnualFacilityClimateSummaryTableComponent,
    EmissionsReductionsChartComponent,
    AbsoluteEmissionsChartComponent,
    TopEmissionsPerformersTableComponent,
    TopPerformersChartComponent,
    AccountReportTypePipe,
    AnalysisReportComponent,
    AnalysisReportSetupComponent,
    AccountSavingsReportComponent,
    AccountSavingsReportSetupComponent,
    AccountEmissionFactorsReportComponent,
    AccountEmissionFactorsReportTableComponent,
    AccountReportsDashboardTableComponent,
    ReportOrderByPipe,
    ReportBadgeClassPipe,
    AccountReportsDataCheckComponent,
    AccountReportAnalysisSelectionComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    ReactiveFormsModule,
    FormsModule,
    LabelWithTooltipModule,
    CalculatingSpinnerModule,
    DataOverviewModule,
    SharedAnalysisModule,
    NgbPagination,
    TableItemsDropdownModule,
    SharedReportsModule
],
  providers: [
    AccountReportTypePipe,
    CustomNumberPipe,
    NaicsDisplayPipe
  ]
})
export class AccountReportsModule { }
