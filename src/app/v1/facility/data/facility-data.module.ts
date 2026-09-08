import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent,
    FacilityMetersComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    FacilityDataPlaceholderComponent,
    FacilityMetersComponent
  ]
})
export class FacilityDataModule { }
