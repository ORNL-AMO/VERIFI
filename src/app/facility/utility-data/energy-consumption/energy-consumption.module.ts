import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditMeterComponent } from './energy-source/edit-meter/edit-meter.component';
import { EnergySourceComponent } from './energy-source/energy-source.component';
import { UtilityMeterDataComponent } from './utility-meter-data/utility-meter-data.component';
import { EnergyConsumptionComponent } from './energy-consumption.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { EditMeterFormModule } from './energy-source/edit-meter-form/edit-meter-form.module';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';
import { UtilityMetersTableComponent } from './energy-source/utility-meters-table/utility-meters-table.component';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { SharedMeterContentModule } from 'src/app/shared/shared-meter-content/shared-meter-content.module';
@NgModule({
  declarations: [
    EditMeterComponent,
    EnergySourceComponent,
    UtilityMeterDataComponent,
    EnergyConsumptionComponent,
    UtilityMetersTableComponent
  ],
  imports: [
    CommonModule,
    EditMeterFormModule,
    ReactiveFormsModule,
    FormsModule,
    NgbPaginationModule,
    HelperPipesModule,
    RouterModule,
    TableItemsDropdownModule,
    SharedMeterContentModule
  ]
})
export class EnergyConsumptionModule { }
