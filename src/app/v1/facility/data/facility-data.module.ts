import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FacilityDataPlaceholderComponent
  ]
})
export class FacilityDataModule { }
