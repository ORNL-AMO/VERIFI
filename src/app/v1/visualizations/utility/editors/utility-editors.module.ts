import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ResourcePickerModule } from '../../shared/resource-picker/resource-picker.module';
import { UtilitySourceEditorComponent } from './source-editor/utility-source-editor.component';
import { DecisionSectionModule } from '../../shared/decision-section/decision-section.module';
import { ItemSettingsModule } from '../../time-series/settings/item-settings/item-settings.module';

@NgModule({ declarations: [UtilitySourceEditorComponent], imports: [CommonModule, ReactiveFormsModule, IconComponent, ResourcePickerModule, DecisionSectionModule, ItemSettingsModule],
  exports: [UtilitySourceEditorComponent] })
export class UtilityEditorsModule { }
