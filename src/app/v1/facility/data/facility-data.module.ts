import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';
import { MeterWorkbenchMonthlyDataComponent } from './meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from './meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from './meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from './meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterSettingsChargesFormComponent } from './meters/meter-workbench/settings/meter-settings-charges-form/meter-settings-charges-form.component';
import { MeterSettingsCoreFormComponent } from './meters/meter-workbench/settings/meter-settings-core-form/meter-settings-core-form.component';
import { MeterSettingsElectricityFormComponent } from './meters/meter-workbench/settings/meter-settings-electricity-form/meter-settings-electricity-form.component';
import { MeterSettingsEmissionsDetailsComponent } from './meters/meter-workbench/settings/meter-settings-emissions-details/meter-settings-emissions-details.component';
import { MeterSettingsOtherInfoComponent } from './meters/meter-workbench/settings/meter-settings-other-info/meter-settings-other-info.component';
import { MeterSettingsStatusFormComponent } from './meters/meter-workbench/settings/meter-settings-status-form/meter-settings-status-form.component';
import { MeterSettingsVehicleFormComponent } from './meters/meter-workbench/settings/meter-settings-vehicle-form/meter-settings-vehicle-form.component';
import { MeterWorkbenchTabsComponent } from './meters/meter-workbench/meter-workbench-tabs/meter-workbench-tabs.component';
import { MeterWorkbenchComponent } from './meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from './meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { ConfirmDeleteMeterModalComponent } from './meters/meters-dashboard/meters-browse-view/meter-browse-card/confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { MetersBrowseViewComponent } from './meters/meters-dashboard/meters-browse-view/meters-browse-view.component';
import { MetersDashboardActionsService } from './meters/meters-dashboard/meters-dashboard-actions.service';
import { MetersDashboardComponent } from './meters/meters-dashboard/meters-dashboard.component';
import { MetersGroupingViewComponent } from './meters/meters-dashboard/meters-grouping-view/meters-grouping-view.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent,
    MeterWorkbenchComponent,
    MeterWorkbenchTabsComponent,
    MeterWorkbenchSettingsComponent,
    MeterSettingsCoreFormComponent,
    MeterSettingsVehicleFormComponent,
    MeterSettingsElectricityFormComponent,
    MeterSettingsChargesFormComponent,
    MeterSettingsOtherInfoComponent,
    MeterSettingsStatusFormComponent,
    MeterSettingsEmissionsDetailsComponent,
    MeterWorkbenchReadingsComponent,
    MeterWorkbenchMonthlyDataComponent,
    MeterWorkbenchYearlyDataComponent,
    MeterWorkbenchQualityReportComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FacilityMetersComponent,
    ConfirmDeleteMeterModalComponent,
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
  ],
  providers: [MetersDashboardActionsService]
})
export class FacilityDataModule { }
