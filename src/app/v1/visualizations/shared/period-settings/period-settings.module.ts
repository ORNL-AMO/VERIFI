import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PeriodSettingsComponent } from './period-settings.component';

@NgModule({ declarations: [PeriodSettingsComponent], imports: [CommonModule, ReactiveFormsModule, IconComponent], exports: [PeriodSettingsComponent] })
export class PeriodSettingsModule { }
