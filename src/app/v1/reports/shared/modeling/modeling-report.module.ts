import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModelingReportComponent } from './modeling-report.component';

@NgModule({ declarations: [ModelingReportComponent], imports: [CommonModule, AnalysisResultNumberPipe, IconComponent], exports: [ModelingReportComponent] })
export class ModelingReportContentModule {}
