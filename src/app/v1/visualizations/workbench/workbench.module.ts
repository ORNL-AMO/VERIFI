import { FacilityPickerModule } from '../shared/facility-picker/facility-picker.module';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { WorkbenchComponent } from './workbench.component';
import { PreviewModule } from '../preview/preview.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { UtilityEditorsModule } from '../utility/editors/utility-editors.module';
import { TimeSeriesModule } from '../time-series/time-series.module';

@NgModule({ declarations: [WorkbenchComponent], imports: [FacilityPickerModule, CommonModule, ReactiveFormsModule, ConfirmationDialogComponent, EditorConflictReviewComponent, PreviewModule, RecoveryModule, UtilityEditorsModule, TimeSeriesModule], exports: [WorkbenchComponent] })
export class WorkbenchModule { }
