import { NgModule } from '@angular/core';
import { OperatingHoursModalComponent } from '@v0/shared/operating-hours-modal/operating-hours-modal.component';
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
