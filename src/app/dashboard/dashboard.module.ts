import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { FacilityOverviewComponent } from './facility-overview/facility-overview.component';
import { UtilityEnergyUseTableComponent } from './facility-overview/utility-energy-use-table/utility-energy-use-table.component';
import { MetersTableComponent } from './facility-overview/meters-table/meters-table.component';
import { FacilityStackedAreaChartComponent } from './facility-overview/facility-stacked-area-chart/facility-stacked-area-chart.component';
import { FacilityHeatMapComponent } from './facility-overview/facility-heat-map/facility-heat-map.component';
import { FacilityBarChartComponent } from './facility-overview/facility-bar-chart/facility-bar-chart.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { AccountOverviewComponent } from './account-overview/account-overview.component';
import { FacilitiesTableComponent } from './account-overview/facilities-table/facilities-table.component';
import { EnergyUseStackedBarChartComponent } from './account-overview/energy-use-stacked-bar-chart/energy-use-stacked-bar-chart.component';
import { EnergyUseHeatMapComponent } from './account-overview/energy-use-heat-map/energy-use-heat-map.component';
import { EnergyUseDonutComponent } from './account-overview/energy-use-donut/energy-use-donut.component';
import { AccountUtilityEnergyUseTableComponent } from './account-overview/account-utility-energy-use-table/account-utility-energy-use-table.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    DashboardComponent,
    FacilityOverviewComponent,
    UtilityEnergyUseTableComponent,
    MetersTableComponent,
    FacilityStackedAreaChartComponent,
    FacilityHeatMapComponent,
    FacilityBarChartComponent,
    EmptyStateComponent,
    AccountOverviewComponent,
    FacilitiesTableComponent,
    EnergyUseStackedBarChartComponent,
    EnergyUseHeatMapComponent,
    EnergyUseDonutComponent,
    AccountUtilityEnergyUseTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HelperPipesModule,
    RouterModule
  ]
})
export class DashboardModule { }
