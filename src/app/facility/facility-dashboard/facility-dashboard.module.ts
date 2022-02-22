import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityDashboardComponent } from './facility-dashboard.component';
import { FacilityDashboardMenuComponent } from './facility-dashboard-menu/facility-dashboard-menu.component';
import { UtilityEnergyUseTableComponent } from './utility-energy-use-table/utility-energy-use-table.component';
import { MetersTableComponent } from './meters-table/meters-table.component';
import { FacilityStackedAreaChartComponent } from './facility-stacked-area-chart/facility-stacked-area-chart.component';
import { FacilityHeatMapComponent } from './facility-heat-map/facility-heat-map.component';
import { FacilityBarChartComponent } from './facility-bar-chart/facility-bar-chart.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    FacilityBarChartComponent,
    FacilityHeatMapComponent,
    FacilityStackedAreaChartComponent,
    MetersTableComponent,
    UtilityEnergyUseTableComponent,
    FacilityDashboardMenuComponent,
    FacilityDashboardComponent
  ],
  imports: [
    CommonModule,
    HelperPipesModule,
    FormsModule
  ]
})
export class FacilityDashboardModule { }
