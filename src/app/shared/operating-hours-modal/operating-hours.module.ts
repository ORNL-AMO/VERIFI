import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatingHoursModalComponent } from './operating-hours-modal.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    OperatingHoursModalComponent
  ],
  imports: [
    FormsModule
  ],
  exports: [
    OperatingHoursModalComponent
  ]
})
export class OperatingHoursModalModule { }
