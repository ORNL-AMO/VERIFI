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
import { FacilityReportLandingComponent } from './facility-report-landing/facility-report-landing.component';
import { ReportDraftSlideoutComponent } from './report-draft-slideout/report-draft-slideout.component';

@NgModule({
  declarations: [FacilityReportsDashboardComponent, FacilityReportLandingComponent, ReportDraftSlideoutComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent, DataEmptyStateComponent,
    ResourceBrowseCardComponent, WorkspaceSlideoutComponent, ConfirmationDialogComponent]
})
export class FacilityReportsModule { }
