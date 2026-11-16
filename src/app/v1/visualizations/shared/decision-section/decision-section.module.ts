import { NgModule } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DecisionSectionComponent } from './decision-section.component';

@NgModule({ declarations: [DecisionSectionComponent], imports: [IconComponent], exports: [DecisionSectionComponent] })
export class DecisionSectionModule { }
