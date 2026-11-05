import type { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { EnergyUsesInventoryComponent } from './inventory/energy-uses-inventory.component';
import { inventoryLeaveGuard } from '@app/v1/shell/inventory-leave.guard';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { EnergyUseSettingsComponent } from './energy-use-workbench/settings/energy-use-settings.component';

export const ENERGY_USE_WORKBENCH_ROUTES: Routes = [{
  path: 'energy-uses/groups/:energyUseGroupGuid', component: EnergyUsesInventoryComponent, canDeactivate: [inventoryLeaveGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange'
}, {
  path: 'energy-uses/:energyUseGuid', component: EnergyUseWorkbenchComponent,
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'settings' },
    { path: 'settings', component: EnergyUseSettingsComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' },
    { path: '**', redirectTo: 'settings' }
  ]
}];
