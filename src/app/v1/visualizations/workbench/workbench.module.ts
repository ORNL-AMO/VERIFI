import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { WorkbenchComponent } from './workbench.component';

@NgModule({ declarations: [WorkbenchComponent], imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent, EditorConflictReviewComponent], exports: [WorkbenchComponent] })
export class WorkbenchModule { }
