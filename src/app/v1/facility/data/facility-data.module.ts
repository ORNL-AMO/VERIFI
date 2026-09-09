import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';
import { ConfirmDeleteGroupModalComponent } from './meters/meters-dashboard/confirm-delete-group-modal/confirm-delete-group-modal.component';
import { MeterBrowseCardComponent } from './meters/meters-dashboard/meter-browse-card/meter-browse-card.component';
import { MeterCardComponent } from './meters/meters-dashboard/meter-card/meter-card.component';
import { MeterDashboardSlideoutComponent } from './meters/meters-dashboard/meter-dashboard-slideout/meter-dashboard-slideout.component';
import { MeterDraftSlideoutComponent } from './meters/meters-dashboard/meter-draft-slideout/meter-draft-slideout.component';
import { MeterGroupDraftSlideoutComponent } from './meters/meters-dashboard/meter-group-draft-slideout/meter-group-draft-slideout.component';
import { MeterGroupLaneComponent } from './meters/meters-dashboard/meter-group-lane/meter-group-lane.component';
import { MeterWorkbenchComponent } from './meters/meter-workbench/meter-workbench.component';
import { MetersBrowseViewComponent } from './meters/meters-dashboard/meters-browse-view/meters-browse-view.component';
import { MetersDashboardComponent } from './meters/meters-dashboard/meters-dashboard.component';
import { MetersGroupingViewComponent } from './meters/meters-dashboard/meters-grouping-view/meters-grouping-view.component';
import { MoveMeterSlideoutComponent } from './meters/meters-dashboard/move-meter-slideout/move-meter-slideout.component';

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
    MetersGroupingViewComponent,
    MeterBrowseCardComponent,
    MeterGroupLaneComponent,
    MeterCardComponent,
    MeterDashboardSlideoutComponent,
    MeterDraftSlideoutComponent,
    MeterGroupDraftSlideoutComponent,
    MoveMeterSlideoutComponent,
    ConfirmDeleteGroupModalComponent
  ],
  exports: [
    FacilityDataPlaceholderComponent,
    FacilityMetersComponent,
    MetersDashboardComponent,
    MetersBrowseViewComponent,
    MetersGroupingViewComponent,
    MeterBrowseCardComponent,
    MeterWorkbenchComponent,
    MeterGroupLaneComponent,
    MeterCardComponent,
    MeterDashboardSlideoutComponent,
    MeterDraftSlideoutComponent,
    MeterGroupDraftSlideoutComponent,
    MoveMeterSlideoutComponent,
    ConfirmDeleteGroupModalComponent
  ]
})
export class FacilityDataModule { }
