import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataOverviewMapComponent } from './data-overview-map/data-overview-map.component';
import { FacilityUsageDonutComponent } from './facility-usage-donut/facility-usage-donut.component';
import { FacilitiesUsageTableComponent } from './facilities-usage-table/facilities-usage-table.component';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';



@NgModule({
  declarations: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent,
    FacilitiesUsageTableComponent
  ],
  imports: [
    CommonModule,
    HelperPipesModule
  ],
  exports: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent,
    FacilitiesUsageTableComponent
  ]
})
export class DataOverviewModule { }
