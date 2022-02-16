import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityComponent } from './facility.component';
import { FacilityDashboardComponent } from './facility-dashboard/facility-dashboard.component';
import { FacilityBannerComponent } from './facility-banner/facility-banner.component';
import { RouterModule } from '@angular/router';
import { FacilityBarChartComponent } from './facility-dashboard/facility-bar-chart/facility-bar-chart.component';
import { FacilityHeatMapComponent } from './facility-dashboard/facility-heat-map/facility-heat-map.component';
import { FacilityStackedAreaChartComponent } from './facility-dashboard/facility-stacked-area-chart/facility-stacked-area-chart.component';
import { MetersTableComponent } from './facility-dashboard/meters-table/meters-table.component';
import { UtilityEnergyUseTableComponent } from './facility-dashboard/utility-energy-use-table/utility-energy-use-table.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { FacilityDashboardMenuComponent } from './facility-dashboard/facility-dashboard-menu/facility-dashboard-menu.component';
import { FacilitySettingsComponent } from './facility-settings/facility-settings.component';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';



@NgModule({
  declarations: [
    FacilityComponent,
    FacilityDashboardComponent,
    FacilityBannerComponent,
    FacilityBarChartComponent,
    FacilityHeatMapComponent,
    FacilityStackedAreaChartComponent,
    MetersTableComponent,
    UtilityEnergyUseTableComponent,
    FacilityDashboardMenuComponent,
    FacilitySettingsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HelperPipesModule,
    SettingsFormsModule
  ]
})
export class FacilityModule { }
