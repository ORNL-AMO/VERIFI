import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AccountComponent } from './account/account/account.component';
import { FacilityComponent } from './account/facility/facility.component';
import { UtilityComponent } from './utility/utility.component';
import { EnergyConsumptionComponent } from './utility/energy-consumption/energy-consumption.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DataTableComponent } from './utility/data-table/data-table.component';
import { EnergySourceComponent } from './utility/energy-consumption/energy-source/energy-source.component';
import { ElectricityComponent } from './utility/energy-consumption/electricity/electricity.component';
import { NaturalGasComponent } from './utility/energy-consumption/natural-gas/natural-gas.component';
import { StyleGuideComponent } from './shared/style-guide/style-guide.component';

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
          ],
        },
        { path: 'data-table', component: DataTableComponent },
      ]
  },
  { path: 'style-guide', component: StyleGuideComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
