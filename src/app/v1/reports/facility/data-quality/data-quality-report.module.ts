import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataQualityReportPreviewComponent } from './preview/data-quality-report-preview.component';
import { DataQualityReportSetupComponent } from './setup/data-quality-report-setup.component';

@NgModule({ declarations: [DataQualityReportPreviewComponent, DataQualityReportSetupComponent],
  imports: [ReactiveFormsModule, ReportsSharedModule, IconComponent] })
export class DataQualityReportModule {}
