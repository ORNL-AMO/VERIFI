import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccountComponent } from './account/account/account.component';
import { FacilityComponent } from './account/facility/facility.component';
import { UtilityComponent } from './utility/utility.component';
import { EnergyConsumptionComponent } from './utility/energy-consumption/energy-consumption.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MoMeterDataComponent } from './utility/mo-meter-data/mo-meter-data.component';
import { DataTableComponent } from './utility/data-table/data-table.component';
import { PredictorsComponent } from './utility/predictors/predictors.component';
import { EnergySourceComponent } from './utility/energy-consumption/energy-source/energy-source.component';
import { StyleGuideComponent } from './shared/style-guide/style-guide.component';
import { UtilityMeterDataComponent } from './utility/energy-consumption/utility-meter-data/utility-meter-data.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'account/account', component: AccountComponent },
  { path: 'account/facility', component: FacilityComponent },
  { path: 'utility',
      component: UtilityComponent,
      children: [
        {
          path: 'energy-consumption', component: EnergyConsumptionComponent, 
          children: [
            { path: '', component: EnergySourceComponent },
            { path: 'electricity', component: UtilityMeterDataComponent },
            { path: 'natural-gas', component: UtilityMeterDataComponent },
            { path: 'other-fuels', component: UtilityMeterDataComponent },
            { path: 'other-energy', component: UtilityMeterDataComponent },
            { path: 'water', component: UtilityMeterDataComponent },
            { path: 'waste-water', component: UtilityMeterDataComponent },
            { path: 'other-utility', component: UtilityMeterDataComponent },
          ],
        },
        { path: 'mo-meter-data', component: MoMeterDataComponent },
        { path: 'data-table', component: DataTableComponent },
        { path: 'predictors', component: PredictorsComponent },
      ]
  },
  { path: 'style-guide', component: StyleGuideComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
