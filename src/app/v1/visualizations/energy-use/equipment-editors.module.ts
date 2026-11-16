import { DecisionSectionModule } from '../shared/decision-section/decision-section.module';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ResourcePickerModule } from '../shared/resource-picker/resource-picker.module';
import { ItemSettingsModule } from '../time-series/settings/item-settings/item-settings.module';
import { EquipmentSourceEditorComponent } from './source-editor/equipment-source-editor.component';

@NgModule({ declarations: [EquipmentSourceEditorComponent], imports: [DecisionSectionModule, IconComponent, CommonModule, ReactiveFormsModule, ResourcePickerModule, ItemSettingsModule], exports: [EquipmentSourceEditorComponent, ResourcePickerModule] })
export class EquipmentEditorsModule { }
