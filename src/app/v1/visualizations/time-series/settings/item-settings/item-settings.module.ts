import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DecisionSectionModule } from '../../../shared/decision-section/decision-section.module';
import { ItemSettingsComponent } from './item-settings.component';

@NgModule({ declarations: [ItemSettingsComponent], imports: [ReactiveFormsModule, IconComponent, DecisionSectionModule], exports: [ItemSettingsComponent] })
export class ItemSettingsModule { }
