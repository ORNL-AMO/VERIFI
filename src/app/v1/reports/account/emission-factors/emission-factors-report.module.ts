import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { EmissionFactorsModule } from '@app/v1/reports/shared/emission-factors/emission-factors.module';
import { AccountEmissionFactorsReportSetupComponent } from './setup/emission-factors-report-setup.component';
import { AccountEmissionFactorsReportPreviewComponent } from './preview/emission-factors-report-preview.component';

@NgModule({ declarations: [AccountEmissionFactorsReportSetupComponent, AccountEmissionFactorsReportPreviewComponent],
  imports: [CommonModule, ReactiveFormsModule, EmissionFactorsModule, ReportsSharedModule] })
export class AccountEmissionFactorsReportModule {}
