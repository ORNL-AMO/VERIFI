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
          ],
        },
        { path: 'data-table', component: DataTableComponent },
      ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
