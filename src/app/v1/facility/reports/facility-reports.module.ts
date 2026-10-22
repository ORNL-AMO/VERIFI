import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { FacilityReportsDashboardComponent } from './facility-reports-dashboard/facility-reports-dashboard.component';
import { FacilityReportWorkbenchComponent } from './facility-report-workbench/facility-report-workbench.component';
import { FacilityReportSetupComponent } from './facility-report-workbench/setup/facility-report-setup.component';
import { FacilityReportDataChecksComponent } from './facility-report-workbench/data-checks/facility-report-data-checks.component';
import { FacilityReportPreviewComponent } from './facility-report-workbench/preview/facility-report-preview.component';
import { AnalysisStageNavigationComponent } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { ReportDraftSlideoutComponent } from './report-draft-slideout/report-draft-slideout.component';

@NgModule({
  declarations: [FacilityReportsDashboardComponent, FacilityReportWorkbenchComponent, FacilityReportSetupComponent,
    FacilityReportDataChecksComponent, FacilityReportPreviewComponent, ReportDraftSlideoutComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent, DataEmptyStateComponent,
    ResourceBrowseCardComponent, WorkspaceSlideoutComponent, ConfirmationDialogComponent, AnalysisStageNavigationComponent, DataWorkbenchResourceSwitcherComponent, DataWorkbenchFactsToggleComponent]
})
export class FacilityReportsModule { }
