import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountComponent } from './account.component';
import { AccountDashboardComponent } from './account-dashboard/account-dashboard.component';
import { RouterModule } from '@angular/router';
import { AccountBannerComponent } from './account-banner/account-banner.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { AccountDashboardMenuComponent } from './account-dashboard/account-dashboard-menu/account-dashboard-menu.component';
import { FormsModule } from '@angular/forms';
import { AccountUtilityEnergyUseTableComponent } from './account-dashboard/account-utility-energy-use-table/account-utility-energy-use-table.component';
import { EnergyUseDonutComponent } from './account-dashboard/energy-use-donut/energy-use-donut.component';
import { EnergyUseHeatMapComponent } from './account-dashboard/energy-use-heat-map/energy-use-heat-map.component';
import { EnergyUseStackedBarChartComponent } from './account-dashboard/energy-use-stacked-bar-chart/energy-use-stacked-bar-chart.component';
import { FacilitiesTableComponent } from './account-dashboard/facilities-table/facilities-table.component';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';


@NgModule({
  declarations: [
    AccountComponent,
    AccountDashboardComponent,
    AccountBannerComponent,
    AccountSettingsComponent,
    AccountDashboardMenuComponent,
    AccountUtilityEnergyUseTableComponent,
    EnergyUseDonutComponent,
    EnergyUseHeatMapComponent,
    EnergyUseStackedBarChartComponent,
    FacilitiesTableComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HelperPipesModule,
    SettingsFormsModule
  ]
})
export class AccountModule { }
