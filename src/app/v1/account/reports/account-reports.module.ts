import { BetterPlantsPreviewComponent } from './better-plants/preview/better-plants-preview.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { BetterPlantsDataChecksComponent } from './better-plants/data-checks/better-plants-data-checks.component';
import { BetterPlantsSetupComponent } from './better-plants/setup/better-plants-setup.component';
import { AccountAnalysisDetailsSlideoutComponent } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-details-slideout/account-analysis-details-slideout.component';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/facility/analysis/facility-analysis-dashboard/analysis-details-slideout/analysis-details-slideout.component';
import { BetterPlantsReportingPeriodComponent } from './better-plants/setup/reporting-period/better-plants-reporting-period.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ReportsModule } from '@app/v1/shared/reports/reports.module';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountReportWorkbenchComponent } from './account-report-workbench/account-report-workbench.component';
import { AccountReportSetupComponent } from './account-report-workbench/setup/account-report-setup.component';
import { AccountReportDataChecksComponent } from './account-report-workbench/data-checks/account-report-data-checks.component';
import { AccountReportPreviewComponent } from './account-report-workbench/preview/account-report-preview.component';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';
import { AccountReportDeleteComponent } from './account-report-workbench/delete/account-report-delete.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';

@NgModule({ declarations: [AccountReportDeleteComponent, BetterPlantsPreviewComponent, BetterPlantsDataChecksComponent, BetterPlantsSetupComponent, BetterPlantsReportingPeriodComponent, AccountReportWorkbenchComponent, AccountReportSetupComponent, AccountReportDataChecksComponent, AccountReportPreviewComponent, AccountReportsDashboardComponent],
  imports: [ConfirmationDialogComponent, AccountAnalysisDetailsSlideoutComponent, AnalysisDetailsSlideoutComponent, AnalysisResultNumberPipe, ReactiveFormsModule, CommonModule, RouterModule, IconComponent, DataEmptyStateComponent, ReportsModule] })
export class AccountReportsModule { }
