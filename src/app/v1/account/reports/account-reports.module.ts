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

@NgModule({ declarations: [AccountReportWorkbenchComponent, AccountReportSetupComponent, AccountReportDataChecksComponent, AccountReportPreviewComponent, AccountReportsDashboardComponent],
  imports: [ReactiveFormsModule, CommonModule, RouterModule, IconComponent, DataEmptyStateComponent, ReportsModule] })
export class AccountReportsModule { }
