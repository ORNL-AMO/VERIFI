import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataOverviewMapComponent } from './data-overview-map/data-overview-map.component';
import { FacilityUsageDonutComponent } from './facility-usage-donut/facility-usage-donut.component';



@NgModule({
  declarations: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DataOverviewMapComponent,
    FacilityUsageDonutComponent
  ]
})
export class DataOverviewModule { }
