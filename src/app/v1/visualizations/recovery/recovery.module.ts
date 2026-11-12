import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { RecoveryActionsComponent } from './recovery-actions/recovery-actions.component';

@NgModule({ declarations: [RecoveryActionsComponent], imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent], exports: [RecoveryActionsComponent] })
export class RecoveryModule { }
