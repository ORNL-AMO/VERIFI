import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountReportComponent } from './basic-report/account-report/account-report.component';
import { AccountReportDonutComponent } from './basic-report/account-report/account-report-donut/account-report-donut.component';
import { AccountReportFacilityBarChartComponent } from './basic-report/account-report/account-report-facility-bar-chart/account-report-facility-bar-chart.component';
import { AccountReportFacilitySummaryTableComponent } from './basic-report/account-report/account-report-facility-summary-table/account-report-facility-summary-table.component';
import { AccountReportInfoComponent } from './basic-report/account-report/account-report-info/account-report-info.component';
import { AccountReportUtilityUsageBarChartComponent } from './basic-report/account-report/account-report-utility-usage-bar-chart/account-report-utility-usage-bar-chart.component';
import { AccountReportUtilityUsageTableComponent } from './basic-report/account-report/account-report-utility-usage-table/account-report-utility-usage-table.component';
import { FacilityReportComponent } from './basic-report/facility-report/facility-report.component';
import { FacilityReportBarChartComponent } from './basic-report/facility-report/facility-report-bar-chart/facility-report-bar-chart.component';
import { FacilityReportInfoComponent } from './basic-report/facility-report/facility-report-info/facility-report-info.component';
import { FacilityReportMetersTableComponent } from './basic-report/facility-report/facility-report-meters-table/facility-report-meters-table.component';
import { FacilityReportUtilityUsageTableComponent } from './basic-report/facility-report/facility-report-utility-usage-table/facility-report-utility-usage-table.component';
import { FrontPageComponent } from './basic-report/front-page/front-page.component';
import { MeterReadingsReportComponent } from './basic-report/meter-readings-report/meter-readings-report.component';
import { BasicReportComponent } from './basic-report/basic-report.component';
import { OverviewReportBannerComponent } from './overview-report-banner/overview-report-banner.component';
import { OverviewReportDashboardComponent } from './overview-report-dashboard/overview-report-dashboard.component';
import { OverviewReportMenuComponent } from './overview-report-menu/overview-report-menu.component';
import { ManageReportTemplatesComponent } from './overview-report-menu/manage-report-templates/manage-report-templates.component';
import { OverviewReportComponent } from './overview-report.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '../../shared/helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { BetterPlantsReportMenuComponent } from './better-plants-report-menu/better-plants-report-menu.component';
import { BetterPlantsReportComponent } from './better-plants-report/better-plants-report.component';
import { CompanyInformationTableComponent } from './better-plants-report/company-information-table/company-information-table.component';
import { PrimaryEnergyConsumptionTableComponent } from './better-plants-report/primary-energy-consumption-table/primary-energy-consumption-table.component';
import { FacilityPerformanceTableComponent } from './better-plants-report/facility-performance-table/facility-performance-table.component';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';



@NgModule({
  declarations: [
    AccountReportComponent,
    AccountReportDonutComponent,
    AccountReportFacilityBarChartComponent,
    AccountReportFacilitySummaryTableComponent,
    AccountReportInfoComponent,
    AccountReportUtilityUsageBarChartComponent,
    AccountReportUtilityUsageTableComponent,
    FacilityReportComponent,
    FacilityReportBarChartComponent,
    FacilityReportInfoComponent,
    FacilityReportMetersTableComponent,
    FacilityReportUtilityUsageTableComponent,
    FrontPageComponent,
    MeterReadingsReportComponent,
    BasicReportComponent,
    OverviewReportBannerComponent,
    OverviewReportDashboardComponent,
    OverviewReportMenuComponent,
    ManageReportTemplatesComponent,
    OverviewReportComponent,
    BetterPlantsReportMenuComponent,
    BetterPlantsReportComponent,
    CompanyInformationTableComponent,
    PrimaryEnergyConsumptionTableComponent,
    FacilityPerformanceTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HelperPipesModule,
    RouterModule,
    NgbPaginationModule,
    LabelWithTooltipModule,
    CalculatingSpinnerModule,
    TableItemsDropdownModule
  ]
})
export class OverviewReportModule { }
