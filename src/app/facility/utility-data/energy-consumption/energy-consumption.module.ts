import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditMeterComponent } from './energy-source/edit-meter/edit-meter.component';
import { EnergySourceComponent } from './energy-source/energy-source.component';
import { EditElectricityBillComponent } from './utility-meter-data/edit-bill/edit-electricity-bill/edit-electricity-bill.component';
import { EditUtilityBillComponent } from './utility-meter-data/edit-bill/edit-utility-bill/edit-utility-bill.component';
import { UtilityMeterDataFilterComponent } from './utility-meter-data/utility-meter-data-filter/utility-meter-data-filter.component';
import { UtilityMeterDataComponent } from './utility-meter-data/utility-meter-data.component';
import { EnergyConsumptionComponent } from './energy-consumption.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { EditMeterFormModule } from './energy-source/edit-meter-form/edit-meter-form.module';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';
import { UtilityMetersTableComponent } from './energy-source/utility-meters-table/utility-meters-table.component';
import { EditBillComponent } from './utility-meter-data/edit-bill/edit-bill.component';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { EditVehicleMeterBillComponent } from './utility-meter-data/edit-bill/edit-vehicle-meter-bill/edit-vehicle-meter-bill.component';
import { RefrigerationCalculationTableComponent } from './utility-meter-data/edit-bill/edit-other-emissions-bill/refrigeration-calculation-table/refrigeration-calculation-table.component';
import { EditOtherEmissionsBillComponent } from './utility-meter-data/edit-bill/edit-other-emissions-bill/edit-other-emissions-bill.component';
import { MeterDataModule } from 'src/app/shared/meter-data/meter-data.module';
@NgModule({
  declarations: [
    EditMeterComponent,
    EnergySourceComponent,
    EditElectricityBillComponent,
    EditUtilityBillComponent,
    UtilityMeterDataFilterComponent,
    UtilityMeterDataComponent,
    EnergyConsumptionComponent,
    UtilityMetersTableComponent,
    EditBillComponent,
    EditVehicleMeterBillComponent,
    RefrigerationCalculationTableComponent,
    EditOtherEmissionsBillComponent
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
    MeterDataModule
  ]
})
export class EnergyConsumptionModule { }
