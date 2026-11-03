import { ReportAnalysisChecksStageComponent } from './analysis-checks/analysis-checks-stage/analysis-checks-stage.component';
import { AnalysisDataChecksComponent } from './analysis-checks/analysis-data-checks/analysis-data-checks.component';
import { AnalysisChecksAcknowledgmentComponent } from './analysis-checks/analysis-checks-acknowledgment/analysis-checks-acknowledgment.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ReportWorkbenchHeaderComponent } from './workbench/report-workbench-header/report-workbench-header.component';
import { AnalysisStageNavigationComponent } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { StatusFindingActionComponent } from '@app/v1/shared/status/status-finding-action/status-finding-action.component';
import { ReportAnalysisSelectionComponent } from './analysis-selection/report-analysis-selection.component';
import { ReportOutputActionsComponent } from './output/report-output-actions/report-output-actions.component';

import { ReportWorkbenchShellComponent } from './workbench/shell/report-workbench-shell.component';
import { ReportStageOutletComponent } from './workbench/stage-outlet/report-stage-outlet.component';
import { PendingReportStageComponent } from './workbench/pending-stage/pending-report-stage.component';

@NgModule({
  declarations: [ReportAnalysisChecksStageComponent, ReportOutputActionsComponent, ReportAnalysisSelectionComponent, AnalysisChecksAcknowledgmentComponent,
    AnalysisDataChecksComponent, ReportWorkbenchHeaderComponent, ReportWorkbenchShellComponent, ReportStageOutletComponent, PendingReportStageComponent],
  imports: [AnalysisResultNumberPipe, CommonModule, ReactiveFormsModule, RouterModule, IconComponent, WorkspaceSlideoutComponent,
    ConfirmationDialogComponent, DataEmptyStateComponent, AnalysisStageNavigationComponent, DataWorkbenchResourceSwitcherComponent,
    DataWorkbenchFactsToggleComponent, StatusFindingActionComponent],
  exports: [ReportAnalysisChecksStageComponent, ReportOutputActionsComponent, ReportAnalysisSelectionComponent, AnalysisChecksAcknowledgmentComponent,
    AnalysisDataChecksComponent, ReportWorkbenchHeaderComponent, ReportWorkbenchShellComponent, ReportStageOutletComponent,
    PendingReportStageComponent, StatusFindingActionComponent]
})
export class ReportsSharedModule { }
