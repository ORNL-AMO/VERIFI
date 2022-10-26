import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountDashboardMenuComponent } from './account-dashboard-menu/account-dashboard-menu.component';
import { FormsModule } from '@angular/forms';
import { AccountUtilityEnergyUseTableComponent } from './account-utility-energy-use-table/account-utility-energy-use-table.component';
import { EnergyUseDonutComponent } from './energy-use-donut/energy-use-donut.component';
import { EnergyUseHeatMapComponent } from './energy-use-heat-map/energy-use-heat-map.component';
import { EnergyUseStackedBarChartComponent } from './energy-use-stacked-bar-chart/energy-use-stacked-bar-chart.component';
import { FacilitiesTableComponent } from './facilities-table/facilities-table.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { AccountDashboardComponent } from './account-dashboard.component';
import { RouterModule } from '@angular/router';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';



@NgModule({
  declarations: [
    AccountDashboardMenuComponent,
    AccountUtilityEnergyUseTableComponent,
    EnergyUseDonutComponent,
    EnergyUseHeatMapComponent,
    EnergyUseStackedBarChartComponent,
    FacilitiesTableComponent,
    AccountDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HelperPipesModule,
    RouterModule,
    CalculatingSpinnerModule
  ]
})
export class AccountDashboardModule { }
