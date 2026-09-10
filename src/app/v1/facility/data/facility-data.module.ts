import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';
import { MeterWorkbenchComponent } from './meters/meter-workbench/meter-workbench.component';
import { MetersBrowseViewComponent } from './meters/meters-dashboard/meters-browse-view/meters-browse-view.component';
import { MetersDashboardComponent } from './meters/meters-dashboard/meters-dashboard.component';
import { MetersGroupingViewComponent } from './meters/meters-dashboard/meters-grouping-view/meters-grouping-view.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent,
    MeterWorkbenchComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FacilityMetersComponent,
    MetersDashboardComponent,
    MetersBrowseViewComponent,
    MetersGroupingViewComponent
  ],
  exports: [
    FacilityDataPlaceholderComponent,
    FacilityMetersComponent,
    MetersDashboardComponent,
    MetersBrowseViewComponent,
    MetersGroupingViewComponent,
    MeterWorkbenchComponent
  ]
})
export class FacilityDataModule { }
