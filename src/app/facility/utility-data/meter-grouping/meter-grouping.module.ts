import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditMeterGroupFormComponent } from './edit-meter-group-form/edit-meter-group-form.component';
import { EnergyUnitDropdownComponent } from './energy-unit-dropdown/energy-unit-dropdown.component';
import { MeterGroupChartComponent } from './meter-group-chart/meter-group-chart.component';
import { MeterGroupTableComponent } from './meter-group-table/meter-group-table.component';
import { MeterGroupingComponent } from './meter-grouping.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';



@NgModule({
  declarations: [
    EditMeterGroupFormComponent,
    EnergyUnitDropdownComponent,
    MeterGroupChartComponent,
    MeterGroupTableComponent,
    MeterGroupingComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    HelperPipesModule,
    NgbPaginationModule,
    TableItemsDropdownModule
  ]
})
export class MeterGroupingModule { }
