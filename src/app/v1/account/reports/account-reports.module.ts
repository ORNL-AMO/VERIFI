import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ReportSnapshotComponent } from '@app/v1/shared/inventory/report-snapshot/report-snapshot.component';
import { ReportsModule } from '@app/v1/shared/reports/reports.module';
import { AccountReportsLandingComponent } from './account-reports-landing/account-reports-landing.component';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';

@NgModule({ declarations: [AccountReportsLandingComponent, AccountReportsDashboardComponent],
  imports: [CommonModule, RouterModule, IconComponent, PageIdentityComponent, DataEmptyStateComponent, ReportSnapshotComponent, ReportsModule] })
export class AccountReportsModule { }
