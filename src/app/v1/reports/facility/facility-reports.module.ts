import { ReportsModule } from '@app/v1/reports/reports.module';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { FacilityReportWorkbenchComponent } from './workbench/facility-report-workbench.component';
import { FacilityReportSetupComponent } from './workbench/setup/facility-report-setup.component';
import { FacilityReportDataChecksComponent } from './workbench/data-checks/facility-report-data-checks.component';
import { FacilityReportPreviewComponent } from './workbench/preview/facility-report-preview.component';

@NgModule({
  declarations: [FacilityReportWorkbenchComponent, FacilityReportSetupComponent,
    FacilityReportDataChecksComponent, FacilityReportPreviewComponent],
  imports: [ReportsModule, CommonModule, ReactiveFormsModule, RouterModule, IconComponent, DataEmptyStateComponent]
})
export class FacilityReportsModule { }
