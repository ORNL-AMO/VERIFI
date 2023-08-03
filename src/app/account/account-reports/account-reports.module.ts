import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountReportsComponent } from './account-reports.component';
import { AccountReportsBannerComponent } from './account-reports-banner/account-reports-banner.component';
import { RouterModule } from '@angular/router';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';
import { AccountReportsItemCardComponent } from './account-reports-dashboard/account-reports-item-card/account-reports-item-card.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
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
import { FacilitySectionReportComponent } from './data-overview-report/data-overview-facility-report/facility-section-report/facility-section-report.component';
import { DataOverviewAccountReportComponent } from './data-overview-report/data-overview-account-report/data-overview-account-report.component';
import { DataOverviewFacilityReportComponent } from './data-overview-report/data-overview-facility-report/data-overview-facility-report.component';
import { PrintReportButtonComponent } from './print-report-button/print-report-button.component';
import { PrimaryWaterConsumptionTableComponent } from './better-plants-report/primary-water-consumption-table/primary-water-consumption-table.component';
import { PerformanceReportComponent } from './performance-report/performance-report.component';
import { PerformanceSetupComponent } from './account-report-setup/performance-setup/performance-setup.component';
import { PerformanceReportFacilityTableComponent } from './performance-report/performance-report-facility-table/performance-report-facility-table.component';
import { TableCellShadingPipe } from './performance-report/performance-report-facility-table/table-cell-shading.pipe';
import { TableFillPipe } from './performance-report/performance-report-facility-table/table-fill.pipe';
import { PerformanceReportGroupTableComponent } from './performance-report/performance-report-group-table/performance-report-group-table.component';
import { TopFiveTableComponent } from './performance-report/top-five-table/top-five-table.component';
import { PerformanceReportUtilityTableComponent } from './performance-report/performance-report-utility-table/performance-report-utility-table.component';
import { PerformanceChartComponent } from './performance-report/performance-chart/performance-chart.component';



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
    FacilitySectionReportComponent,
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
    TopFiveTableComponent,
    PerformanceReportUtilityTableComponent,
    PerformanceChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    ReactiveFormsModule,
    FormsModule,
    LabelWithTooltipModule,
    CalculatingSpinnerModule,
    DataOverviewModule
  ]
})
export class AccountReportsModule { }
