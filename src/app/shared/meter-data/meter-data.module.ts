import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeterDataComponent } from './meter-data.component';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';
import { MeterDataTableComponent } from './meter-data-table/meter-data-table.component';
import { ElectricityDataTableComponent } from './meter-data-table/electricity-data-table/electricity-data-table.component';
import { GeneralUtilityDataTableComponent } from './meter-data-table/general-utility-data-table/general-utility-data-table.component';
import { OtherEmissionsDataTableComponent } from './meter-data-table/other-emissions-data-table/other-emissions-data-table.component';
import { VehicleDataTableComponent } from './meter-data-table/vehicle-data-table/vehicle-data-table.component';
import { TableItemsDropdownModule } from '../table-items-dropdown/table-items-dropdown.module';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    MeterDataComponent,
    MeterDataTableComponent,
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    OtherEmissionsDataTableComponent,
    VehicleDataTableComponent
  ],
  imports: [
    CommonModule,
    HelperPipesModule,
    RouterModule,
    TableItemsDropdownModule,
    NgbPaginationModule,
    FormsModule
  ],
  exports: [
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    OtherEmissionsDataTableComponent,
    VehicleDataTableComponent
  ]
})
export class MeterDataModule { }
