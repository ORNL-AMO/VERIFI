import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { MeterAnnualTotalTableComponent } from './meter-annual-total-table.component';

@NgModule({
  declarations: [MeterAnnualTotalTableComponent],
  imports: [CommonModule, HelperPipesModule],
  exports: [MeterAnnualTotalTableComponent]
})
export class MeterAnnualTotalTableModule { }