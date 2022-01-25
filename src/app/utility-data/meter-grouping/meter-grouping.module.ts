import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditMeterGroupFormComponent } from './edit-meter-group-form/edit-meter-group-form.component';
import { EnergyUnitDropdownComponent } from './energy-unit-dropdown/energy-unit-dropdown.component';
import { MeterGroupChartComponent } from './meter-group-chart/meter-group-chart.component';
import { MeterGroupTableComponent } from './meter-group-table/meter-group-table.component';
import { MeterGroupingComponent } from './meter-grouping.component';



@NgModule({
  declarations: [
    EditMeterGroupFormComponent,
    EnergyUnitDropdownComponent,
    MeterGroupChartComponent,
    MeterGroupTableComponent,
    MeterGroupingComponent
  ],
  imports: [
    CommonModule
  ]
})
export class MeterGroupingModule { }
