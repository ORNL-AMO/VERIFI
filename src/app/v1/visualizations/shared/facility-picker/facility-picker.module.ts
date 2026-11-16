import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityCardModule } from './facility-card/facility-card.module';
import { FacilityPickerComponent } from './facility-picker.component';

@NgModule({ declarations: [FacilityPickerComponent], imports: [CommonModule, ReactiveFormsModule, IconComponent, FacilityCardModule], exports: [FacilityPickerComponent] })
export class FacilityPickerModule { }
