import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityCardComponent } from './facility-card.component';

@NgModule({ declarations: [FacilityCardComponent], imports: [CommonModule, ReactiveFormsModule, IconComponent], exports: [FacilityCardComponent] })
export class FacilityCardModule { }
