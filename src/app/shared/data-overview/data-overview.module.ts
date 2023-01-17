import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataOverviewMapComponent } from './data-overview-map/data-overview-map.component';



@NgModule({
  declarations: [
    DataOverviewMapComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    DataOverviewMapComponent
  ]
})
export class DataOverviewModule { }
