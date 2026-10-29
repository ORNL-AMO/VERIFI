import { BetterPlantsPreviewComponent } from './better-plants/preview/better-plants-preview.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { BetterPlantsDataChecksComponent } from './better-plants/data-checks/better-plants-data-checks.component';
import { BetterPlantsSetupComponent } from './better-plants/setup/better-plants-setup.component';
import { AccountAnalysisDetailsSlideoutComponent } from '@app/v1/analysis/account/details/account-analysis-details-slideout.component';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/analysis/facility/details/analysis-details-slideout.component';
import { BetterPlantsReportingPeriodComponent } from './better-plants/setup/reporting-period/better-plants-reporting-period.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ReportsModule } from '@app/v1/reports/reports.module';
import { ReactiveFormsModule } from '@angular/forms';
import { AccountReportWorkbenchComponent } from './workbench/account-report-workbench.component';
import { AccountReportSetupComponent } from './workbench/setup/account-report-setup.component';
import { AccountReportDataChecksComponent } from './workbench/data-checks/account-report-data-checks.component';
import { AccountReportPreviewComponent } from './workbench/preview/account-report-preview.component';
import { AccountReportDeleteComponent } from './workbench/delete/account-report-delete.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';

@NgModule({ declarations: [AccountReportDeleteComponent, BetterPlantsPreviewComponent, BetterPlantsDataChecksComponent, BetterPlantsSetupComponent, BetterPlantsReportingPeriodComponent, AccountReportWorkbenchComponent, AccountReportSetupComponent, AccountReportDataChecksComponent, AccountReportPreviewComponent, ],
  imports: [ConfirmationDialogComponent, AccountAnalysisDetailsSlideoutComponent, AnalysisDetailsSlideoutComponent, AnalysisResultNumberPipe, ReactiveFormsModule, CommonModule, RouterModule, IconComponent, DataEmptyStateComponent, ReportsModule] })
export class AccountReportsModule { }
