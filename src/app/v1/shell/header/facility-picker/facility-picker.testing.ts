import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityPickerComponent } from './facility-picker.component';

@NgModule({
  declarations: [FacilityPickerComponent],
  imports: [OverlayModule, CommonModule, ReactiveFormsModule, IconComponent],
  exports: [FacilityPickerComponent]
})
export class FacilityPickerTestModule {}
