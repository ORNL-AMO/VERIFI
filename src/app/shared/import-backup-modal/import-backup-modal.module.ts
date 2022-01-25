import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    ImportBackupModalModule
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    ImportBackupModalModule
  ]
})
export class ImportBackupModalModule { }
