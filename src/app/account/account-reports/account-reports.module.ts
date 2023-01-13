import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountReportsComponent } from './account-reports.component';
import { AccountReportsBannerComponent } from './account-reports-banner/account-reports-banner.component';
import { RouterModule } from '@angular/router';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';
import { AccountReportsItemCardComponent } from './account-reports-dashboard/account-reports-item-card/account-reports-item-card.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { AccountReportSetupComponent } from './account-report-setup/account-report-setup.component';
import { ReactiveFormsModule } from '@angular/forms';
import { BetterPlantsSetupComponent } from './account-report-setup/better-plants-setup/better-plants-setup.component';
import { DataOverviewSetupComponent } from './account-report-setup/data-overview-setup/data-overview-setup.component';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { BetterPlantsReportComponent } from './better-plants-report/better-plants-report.component';
import { PrimaryEnergyConsumptionTableComponent } from './better-plants-report/primary-energy-consumption-table/primary-energy-consumption-table.component';
import { FacilityPerformanceTableComponent } from './better-plants-report/facility-performance-table/facility-performance-table.component';
import { CompanyInformationTableComponent } from './better-plants-report/company-information-table/company-information-table.component';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';



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
    CompanyInformationTableComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    ReactiveFormsModule,
    LabelWithTooltipModule,
    CalculatingSpinnerModule
  ]
})
export class AccountReportsModule { }
