import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';
import { MeterWorkbenchComponent } from './meters/meter-workbench/meter-workbench.component';
import { MetersDashboardComponent } from './meters/meters-dashboard/meters-dashboard.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent,
    MetersDashboardComponent,
    MeterWorkbenchComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FacilityMetersComponent
  ],
  exports: [
    FacilityDataPlaceholderComponent,
    FacilityMetersComponent,
    MetersDashboardComponent,
    MeterWorkbenchComponent
  ]
})
export class FacilityDataModule { }
