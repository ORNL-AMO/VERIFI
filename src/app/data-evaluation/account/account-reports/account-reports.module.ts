import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountReportsComponent } from './account-reports.component';
import { AccountReportsBannerComponent } from './account-reports-banner/account-reports-banner.component';
import { RouterModule } from '@angular/router';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';
import { AccountReportsItemCardComponent } from './account-reports-dashboard/account-reports-item-card/account-reports-item-card.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { AccountReportSetupComponent } from './account-report-setup/account-report-setup.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BetterPlantsSetupComponent } from './account-report-setup/better-plants-setup/better-plants-setup.component';
import { DataOverviewSetupComponent } from './account-report-setup/data-overview-setup/data-overview-setup.component';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { BetterPlantsReportComponent } from './better-plants-report/better-plants-report.component';
import { PrimaryEnergyConsumptionTableComponent } from './better-plants-report/primary-energy-consumption-table/primary-energy-consumption-table.component';
import { FacilityPerformanceTableComponent } from './better-plants-report/facility-performance-table/facility-performance-table.component';
import { CompanyInformationTableComponent } from './better-plants-report/company-information-table/company-information-table.component';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { DataOverviewReportComponent } from './data-overview-report/data-overview-report.component';
import { AccountTitlePageComponent } from './data-overview-report/data-overview-account-report/account-title-page/account-title-page.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';
import { AccountSectionReportComponent } from './data-overview-report/data-overview-account-report/account-section-report/account-section-report.component';
import { FacilityTitlePageComponent } from './data-overview-report/data-overview-facility-report/facility-title-page/facility-title-page.component';
import { DataOverviewAccountReportComponent } from './data-overview-report/data-overview-account-report/data-overview-account-report.component';
import { DataOverviewFacilityReportComponent } from './data-overview-report/data-overview-facility-report/data-overview-facility-report.component';
import { PrintReportButtonComponent } from './print-report-button/print-report-button.component';
import { PrimaryWaterConsumptionTableComponent } from './better-plants-report/primary-water-consumption-table/primary-water-consumption-table.component';
import { PerformanceReportComponent } from './performance-report/performance-report.component';
import { PerformanceSetupComponent } from './account-report-setup/performance-setup/performance-setup.component';
import { PerformanceReportFacilityTableComponent } from './performance-report/performance-report-facility-table/performance-report-facility-table.component';
import { PerformanceReportGroupTableComponent } from './performance-report/performance-report-group-table/performance-report-group-table.component';
import { PerformanceReportUtilityTableComponent } from './performance-report/performance-report-utility-table/performance-report-utility-table.component';
import { PerformanceChartComponent } from './performance-report/performance-chart/performance-chart.component';
import { TopPerformersTableComponent } from './performance-report/top-performers-table/top-performers-table.component';
import { TableCellShadingPipe } from './report-pipes/table-cell-shading.pipe';
import { TableFillPipe } from './report-pipes/table-fill.pipe';
import { PerformanceReportDashboardComponent } from './account-reports-dashboard/performance-report-dashboard/performance-report-dashboard.component';
import { OverviewReportDashboardComponent } from './account-reports-dashboard/overview-report-dashboard/overview-report-dashboard.component';
import { BetterPlantsReportDashboardComponent } from './account-reports-dashboard/better-plants-report-dashboard/better-plants-report-dashboard.component';
import { AccountReportsDashboardTabsComponent } from './account-reports-dashboard/account-reports-dashboard-tabs/account-reports-dashboard-tabs.component';
import { BetterClimateReportComponent } from './better-climate-report/better-climate-report.component';
import { BetterClimateSetupComponent } from './account-report-setup/better-climate-setup/better-climate-setup.component';
import { BetterClimateReportDashboardComponent } from './account-reports-dashboard/better-climate-report-dashboard/better-climate-report-dashboard.component';
import { PortfolioInformationTableComponent } from './better-climate-report/portfolio-information-table/portfolio-information-table.component';
import { AbsoluteEmissionsTableComponent } from './better-climate-report/absolute-emissions-table/absolute-emissions-table.component';
import { EmissionsReductionsTableComponent } from './better-climate-report/emissions-reductions-table/emissions-reductions-table.component';
import { TotalPortfolioEnergyUseTableComponent } from './better-climate-report/total-portfolio-energy-use-table/total-portfolio-energy-use-table.component';
import { VehicleEnergyUseTableComponent } from './better-climate-report/vehicle-energy-use-table/vehicle-energy-use-table.component';
import { GraphCalculationsTableComponent } from './better-climate-report/graph-calculations-table/graph-calculations-table.component';
import { AnnualFacilityClimateSummaryTableComponent } from './better-climate-report/annual-facility-climate-summary-table/annual-facility-climate-summary-table.component';
import { EmissionsReductionsChartComponent } from './better-climate-report/emissions-reductions-chart/emissions-reductions-chart.component';
import { AbsoluteEmissionsChartComponent } from './better-climate-report/absolute-emissions-chart/absolute-emissions-chart.component';
import { TopEmissionsPerformersTableComponent } from './better-climate-report/top-emissions-performers-table/top-emissions-performers-table.component';
import { TopPerformersChartComponent } from './better-climate-report/top-performers-chart/top-performers-chart.component';
import { AccountReportTypePipe } from './report-pipes/account-report-type.pipe';
import { AnalysisReportDashboardComponent } from './account-reports-dashboard/analysis-report-dashboard/analysis-report-dashboard.component';
import { AnalysisReportComponent } from './analysis-report/analysis-report.component';
import { AnalysisReportSetupComponent } from './account-report-setup/analysis-report-setup/analysis-report-setup.component';
import { AnalysisFacilityReportComponent } from './analysis-report/analysis-facility-report/analysis-facility-report.component';
import { AnalysisProblemsInformationComponent } from './analysis-report/analysis-problems-information/analysis-problems-information.component';
import { AnalysisDataValidationTablesComponent } from './analysis-report/analysis-data-validation-tables/analysis-data-validation-tables.component';
import { AccountEmissionFactorsReportDashboardComponent } from './account-reports-dashboard/account-emission-factors-report-dashboard/account-emission-factors-report-dashboard.component';
import { AccountEmissionFactorsReportComponent } from './account-emission-factors-report/account-emission-factors-report/account-emission-factors-report.component';
import { AccountEmissionFactorsReportTableComponent } from './account-emission-factors-report/account-emission-factors-report-table/account-emission-factors-report-table.component';
import { AccountReportsDashboardTableComponent } from './account-reports-dashboard/account-reports-dashboard-table/account-reports-dashboard-table.component';
import { TableItemsDropdownModule } from "src/app/shared/table-items-dropdown/table-items-dropdown.module";
import { NgbPagination } from "@ng-bootstrap/ng-bootstrap";
import { ReportOrderByPipe } from './report-pipes/report-order-by.pipe';

@NgModule({
  declarations: [
    AccountReportsComponent,
    AccountReportsBannerComponent,
    AccountReportsDashboardComponent,
    AccountReportsItemCardComponent,
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
    PerformanceReportDashboardComponent,
    OverviewReportDashboardComponent,
    BetterPlantsReportDashboardComponent,
    AccountReportsDashboardTabsComponent,
    BetterClimateReportComponent,
    BetterClimateSetupComponent,
    BetterClimateReportDashboardComponent,
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
    AnalysisReportDashboardComponent,
    AnalysisReportComponent,
    AnalysisReportSetupComponent,
    AnalysisFacilityReportComponent,
    AnalysisProblemsInformationComponent,
    AnalysisDataValidationTablesComponent,
    AccountEmissionFactorsReportDashboardComponent,
    AccountEmissionFactorsReportComponent,
    AccountEmissionFactorsReportTableComponent,
    AccountReportsDashboardTableComponent,
    ReportOrderByPipe,
    AccountReportTypePipe
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
    TableItemsDropdownModule,
    NgbPagination
  ],
  providers: [
    AccountReportTypePipe,
  ]
})
export class AccountReportsModule { }
