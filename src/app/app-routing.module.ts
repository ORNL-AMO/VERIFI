import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccountComponent } from './account-management/account/account.component';
import { FacilityComponent } from './account-management/facility/facility.component';
import { UtilityComponent } from './utility/utility.component';
import { EnergyConsumptionComponent } from './utility/energy-consumption/energy-consumption.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EnergySourceComponent } from './utility/energy-consumption/energy-source/energy-source.component';
import { StyleGuideComponent } from './shared/style-guide/style-guide.component';
import { UtilityMeterDataComponent } from './utility/energy-consumption/utility-meter-data/utility-meter-data.component';
import { MeterGroupingComponent } from './utility/meter-grouping/meter-grouping.component';
import { PredictorDataComponent } from './utility/predictor-data/predictor-data.component';
import { CalanderizationComponent } from './utility/calanderization/calanderization.component';

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
        { path: 'mo-meter-data', component: CalanderizationComponent },
        { path: 'meter-groups', component: MeterGroupingComponent },
        { path: 'predictors', component: PredictorDataComponent },
      ]
  },
  { path: 'style-guide', component: StyleGuideComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
