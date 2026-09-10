import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';
import { MeterWorkbenchMonthlyDataComponent } from './meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from './meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from './meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from './meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchTabsComponent } from './meters/meter-workbench/meter-workbench-tabs/meter-workbench-tabs.component';
import { MeterWorkbenchComponent } from './meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from './meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MetersBrowseViewComponent } from './meters/meters-dashboard/meters-browse-view/meters-browse-view.component';
import { MetersDashboardComponent } from './meters/meters-dashboard/meters-dashboard.component';
import { MetersGroupingViewComponent } from './meters/meters-dashboard/meters-grouping-view/meters-grouping-view.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent,
    MeterWorkbenchComponent,
    MeterWorkbenchTabsComponent,
    MeterWorkbenchSettingsComponent,
    MeterWorkbenchReadingsComponent,
    MeterWorkbenchMonthlyDataComponent,
    MeterWorkbenchYearlyDataComponent,
    MeterWorkbenchQualityReportComponent
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
