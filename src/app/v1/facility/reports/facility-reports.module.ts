import { ReportsModule } from '@app/v1/shared/reports/reports.module';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { FacilityReportsDashboardComponent } from './facility-reports-dashboard/facility-reports-dashboard.component';
import { FacilityReportWorkbenchComponent } from './facility-report-workbench/facility-report-workbench.component';
import { FacilityReportSetupComponent } from './facility-report-workbench/setup/facility-report-setup.component';
import { FacilityReportDataChecksComponent } from './facility-report-workbench/data-checks/facility-report-data-checks.component';
import { FacilityReportPreviewComponent } from './facility-report-workbench/preview/facility-report-preview.component';

@NgModule({
  declarations: [FacilityReportsDashboardComponent, FacilityReportWorkbenchComponent, FacilityReportSetupComponent,
    FacilityReportDataChecksComponent, FacilityReportPreviewComponent],
  imports: [ReportsModule, CommonModule, ReactiveFormsModule, RouterModule, IconComponent, DataEmptyStateComponent]
})
export class FacilityReportsModule { }
