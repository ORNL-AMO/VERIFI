import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { WorkbenchComponent } from './workbench.component';
import { PreviewModule } from '../preview/preview.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { UtilityEditorsModule } from '../utility/editors/utility-editors.module';

@NgModule({ declarations: [WorkbenchComponent], imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent, EditorConflictReviewComponent, PreviewModule, RecoveryModule, UtilityEditorsModule], exports: [WorkbenchComponent] })
export class WorkbenchModule { }
