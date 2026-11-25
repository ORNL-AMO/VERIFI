import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { ModelingReportContentModule } from '@app/v1/reports/shared/modeling/modeling-report.module';
import { AccountReportSharedModule } from '../shared/account-report-shared.module';
import { AccountModelingReportSetupComponent } from './setup/modeling-report-setup.component';
import { AccountModelingReportPreviewComponent } from './preview/modeling-report-preview.component';

@NgModule({ declarations: [AccountModelingReportSetupComponent, AccountModelingReportPreviewComponent],
  imports: [CommonModule, ReactiveFormsModule, ReportsSharedModule, ModelingReportContentModule, AccountReportSharedModule] })
export class AccountModelingReportModule {}
