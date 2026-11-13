import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailDataModalComponent } from '@v0/shared/email-verifi-backup/email-data-modal/email-data-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    EmailDataModalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTypeaheadModule
  ],
  exports: [
    EmailDataModalComponent
  ]
})
export class EmailVerifiBackupModule { }
