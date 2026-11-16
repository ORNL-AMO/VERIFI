import { ResourcePickerModule } from '../shared/resource-picker/resource-picker.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ItemSettingsModule } from '../time-series/settings/item-settings/item-settings.module';
import { PredictorPickerComponent } from './predictor-picker/predictor-picker.component';
import { PredictorSourceEditorComponent } from './source-editor/predictor-source-editor.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@NgModule({ declarations: [PredictorPickerComponent, PredictorSourceEditorComponent],
  imports: [ResourcePickerModule, CommonModule, ReactiveFormsModule, ItemSettingsModule, IconComponent], exports: [PredictorPickerComponent, PredictorSourceEditorComponent] })
export class PredictorEditorsModule { }
