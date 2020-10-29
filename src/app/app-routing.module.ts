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
import { ElectricityComponent } from './utility/energy-consumption/electricity/electricity.component';
import { NaturalGasComponent } from './utility/energy-consumption/natural-gas/natural-gas.component';
import { StyleGuideComponent } from './shared/style-guide/style-guide.component';
import { OtherFuelsComponent } from './utility/energy-consumption/other-fuels/other-fuels.component';
import { OtherEnergyComponent } from './utility/energy-consumption/other-energy/other-energy.component';
import { WaterComponent } from './utility/energy-consumption/water/water.component';
import { WasteWaterComponent } from './utility/energy-consumption/waste-water/waste-water.component';
import { OtherUtilityComponent } from './utility/energy-consumption/other-utility/other-utility.component';

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
            { path: 'electricity', component: ElectricityComponent },
            { path: 'natural-gas', component: NaturalGasComponent },
            { path: 'other-fuels', component: OtherFuelsComponent },
            { path: 'other-energy', component: OtherEnergyComponent },
            { path: 'water', component: WaterComponent },
            { path: 'waste-water', component: WasteWaterComponent },
            { path: 'other-utility', component: OtherUtilityComponent },
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
