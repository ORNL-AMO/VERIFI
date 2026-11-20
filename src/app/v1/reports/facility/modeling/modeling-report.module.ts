import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { ModelingReportContentModule } from '@app/v1/reports/shared/modeling/modeling-report.module';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/analysis/facility/details/analysis-details-slideout.component';
import { ModelingReportSetupComponent } from './setup/modeling-report-setup.component';
import { ModelingReportPreviewComponent } from './preview/modeling-report-preview.component';

@NgModule({ declarations: [ModelingReportSetupComponent, ModelingReportPreviewComponent],
  imports: [CommonModule, ReactiveFormsModule, ReportsSharedModule, ModelingReportContentModule, AnalysisDetailsSlideoutComponent] })
export class ModelingReportModule {}
