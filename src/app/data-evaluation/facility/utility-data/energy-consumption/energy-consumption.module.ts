import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { RouterModule } from '@angular/router';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { SharedMeterContentModule } from 'src/app/shared/shared-meter-content/shared-meter-content.module';
import { EnergyConsumptionComponent } from './energy-consumption.component';
import { EnergySourceComponent } from './energy-source/energy-source.component';
import { UtilityMeterDataComponent } from './utility-meter-data/utility-meter-data.component';
@NgModule({
  declarations: [
    EnergyConsumptionComponent,
    EnergySourceComponent,
    UtilityMeterDataComponent
  ],
  imports: [
    CommonModule,
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
