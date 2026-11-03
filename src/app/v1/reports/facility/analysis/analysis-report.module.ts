import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AnalysisResultsTableModule } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.module';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { AnalysisReportResultsTableComponent } from './results-table/analysis-report-results-table.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { AnalysisReportSetupComponent } from './setup/analysis-report-setup.component';
import { AnalysisReportDataChecksComponent } from './data-checks/analysis-report-data-checks.component';
import { AnalysisReportPreviewComponent } from './preview/analysis-report-preview.component';
import { AnalysisReportResultChartsComponent } from './result-charts/analysis-report-result-charts.component';
import { AnalysisReportModelDetailsComponent } from './model-details/analysis-report-model-details.component';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/analysis/facility/details/analysis-details-slideout.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { AnalysisResultMarkerLegendComponent } from '@app/v1/shared/analysis-results/result-markers/analysis-result-marker-legend/analysis-result-marker-legend.component';
import { AnalysisChartsModule } from '@app/v1/shared/analysis-results/chart/analysis-charts.module';
import { AnalysisColumnOptionsComponent } from '@app/v1/shared/analysis-results/column-options/analysis-column-options.component';

@NgModule({ declarations: [AnalysisReportSetupComponent, AnalysisReportDataChecksComponent, AnalysisReportPreviewComponent,
    AnalysisReportResultsTableComponent, AnalysisReportResultChartsComponent, AnalysisReportModelDetailsComponent],
  imports: [AnalysisResultsTableModule, ReportsSharedModule, CommonModule, ReactiveFormsModule, RouterModule, IconComponent, DataEmptyStateComponent,
    AnalysisDetailsSlideoutComponent, AnalysisResultNumberPipe, AnalysisResultMarkerLegendComponent, AnalysisChartsModule, AnalysisColumnOptionsComponent] })
export class AnalysisReportModule { }
