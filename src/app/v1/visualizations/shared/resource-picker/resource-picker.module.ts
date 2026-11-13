import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ResourcePickerComponent } from './resource-picker.component';

@NgModule({ declarations: [ResourcePickerComponent], imports: [CommonModule, ReactiveFormsModule, IconComponent], exports: [ResourcePickerComponent] })
export class ResourcePickerModule { }
