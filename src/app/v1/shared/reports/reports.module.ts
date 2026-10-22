import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { ReportsDashboardComponent } from './reports-dashboard/reports-dashboard.component';
import { ReportLifecycleComponent } from './report-lifecycle/report-lifecycle.component';

@NgModule({ declarations: [ReportsDashboardComponent, ReportLifecycleComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent, WorkspaceSlideoutComponent, ConfirmationDialogComponent,
    DataEmptyStateComponent, InventoryGridComponent, PageIdentityComponent, BrowsePositionDirective, BrowseHeaderDirective],
  exports: [ReportsDashboardComponent, ReportLifecycleComponent] })
export class ReportsModule { }
