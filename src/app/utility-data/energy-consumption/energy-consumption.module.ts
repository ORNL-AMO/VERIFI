import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditMeterComponent } from './energy-source/edit-meter/edit-meter.component';
import { EnergySourceComponent } from './energy-source/energy-source.component';
import { EditElectricityBillComponent } from './utility-meter-data/edit-electricity-bill/edit-electricity-bill.component';
import { EditUtilityBillComponent } from './utility-meter-data/edit-utility-bill/edit-utility-bill.component';
import { ElectricityDataTableComponent } from './utility-meter-data/electricity-data-table/electricity-data-table.component';
import { GeneralUtilityDataTableComponent } from './utility-meter-data/general-utility-data-table/general-utility-data-table.component';
import { UtilityMeterDataFilterComponent } from './utility-meter-data/utility-meter-data-filter/utility-meter-data-filter.component';
import { UtilityMeterDataComponent } from './utility-meter-data/utility-meter-data.component';
import { EnergyConsumptionComponent } from './energy-consumption.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { EditMeterFormModule } from './energy-source/edit-meter-form/edit-meter-form.module';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    EditMeterComponent,
    EnergySourceComponent,
    EditElectricityBillComponent,
    EditUtilityBillComponent,
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    UtilityMeterDataFilterComponent,
    UtilityMeterDataComponent,
    EnergyConsumptionComponent
  ],
  imports: [
    CommonModule,
    EditMeterFormModule,
    ReactiveFormsModule,
    FormsModule,
    NgbPaginationModule,
    HelperPipesModule,
    RouterModule
  ]
})
export class EnergyConsumptionModule { }
