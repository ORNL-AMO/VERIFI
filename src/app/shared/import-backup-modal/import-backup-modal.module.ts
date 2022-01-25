import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportBackupModalComponent } from './import-backup-modal.component';



@NgModule({
  declarations: [
    ImportBackupModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    ImportBackupModalComponent
  ]
})
export class ImportBackupModalModule { }
