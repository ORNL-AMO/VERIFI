import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { EmissionFactorsModule } from '@app/v1/reports/shared/emission-factors/emission-factors.module';
import { EmissionFactorsReportSetupComponent } from './setup/emission-factors-report-setup.component';
import { EmissionFactorsReportPreviewComponent } from './preview/emission-factors-report-preview.component';

@NgModule({ declarations: [EmissionFactorsReportSetupComponent, EmissionFactorsReportPreviewComponent],
  imports: [CommonModule, ReactiveFormsModule, EmissionFactorsModule, ReportsSharedModule] })
export class EmissionFactorsReportModule {}
