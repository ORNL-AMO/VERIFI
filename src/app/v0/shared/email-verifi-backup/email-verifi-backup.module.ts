import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailDataModalComponent } from '@v0/shared/email-verifi-backup/email-data-modal/email-data-modal.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    EmailDataModalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  exports: [
    EmailDataModalComponent
  ]
})
export class EmailVerifiBackupModule { }
