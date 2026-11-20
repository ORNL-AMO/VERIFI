import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { EmissionFactorsTableComponent } from './emission-factors-table/emission-factors-table.component';

@NgModule({ declarations: [EmissionFactorsTableComponent], imports: [CommonModule], exports: [EmissionFactorsTableComponent] })
export class EmissionFactorsModule {}
