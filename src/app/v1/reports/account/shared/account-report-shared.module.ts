import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountAnalysisDetailsSlideoutComponent } from '@app/v1/analysis/account/details/account-analysis-details-slideout.component';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/analysis/facility/details/analysis-details-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ReportsSharedModule } from '../../shared/reports-shared.module';
import { AccountReportAnalysisSelectionComponent } from './analysis-selection/account-report-analysis-selection.component';
import { AccountReportDeleteComponent } from '../workbench/delete/account-report-delete.component';

@NgModule({ declarations: [AccountReportAnalysisSelectionComponent, AccountReportDeleteComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent, ReportsSharedModule, ConfirmationDialogComponent,
    AccountAnalysisDetailsSlideoutComponent, AnalysisDetailsSlideoutComponent],
  exports: [AccountReportAnalysisSelectionComponent, AccountReportDeleteComponent] })
export class AccountReportSharedModule { }
