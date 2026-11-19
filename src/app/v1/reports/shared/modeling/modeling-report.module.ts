import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModelingReportComponent } from './modeling-report.component';
import { ModelEquationModule } from '@app/v1/shared/analysis-results/model-equation/model-equation.module';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';

@NgModule({ declarations: [ModelingReportComponent], imports: [CommonModule, AnalysisResultNumberPipe, IconComponent, ModelEquationModule, AnalysisChartsModule], exports: [ModelingReportComponent] })
export class ModelingReportContentModule {}
