import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { RouterModule } from '@angular/router';
import { TableItemsDropdownModule } from '@shared/table-items-dropdown/table-items-dropdown.module';
import { SharedMeterContentModule } from '@shared/shared-meter-content/shared-meter-content.module';
import { EnergyConsumptionComponent } from '@v0/data-evaluation/facility/utility-data/energy-consumption/energy-consumption.component';
import { EnergySourceComponent } from '@v0/data-evaluation/facility/utility-data/energy-consumption/energy-source/energy-source.component';
import { UtilityMeterDataComponent } from '@v0/data-evaluation/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.component';
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
