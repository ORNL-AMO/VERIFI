import { FacilityPickerModule } from '../shared/facility-picker/facility-picker.module';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { RecoveryActionsComponent } from './recovery-actions/recovery-actions.component';

@NgModule({ declarations: [RecoveryActionsComponent], imports: [CommonModule, ReactiveFormsModule, ConfirmationDialogComponent, FacilityPickerModule], exports: [RecoveryActionsComponent] })
export class RecoveryModule { }
