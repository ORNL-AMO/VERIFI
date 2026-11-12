import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { UtilitySourceEditorComponent } from './source-editor/utility-source-editor.component';
import { PeriodSettingsComponent } from './period-settings/period-settings.component';

@NgModule({ declarations: [UtilitySourceEditorComponent, PeriodSettingsComponent], imports: [CommonModule, ReactiveFormsModule],
  exports: [UtilitySourceEditorComponent, PeriodSettingsComponent] })
export class UtilityEditorsModule { }
