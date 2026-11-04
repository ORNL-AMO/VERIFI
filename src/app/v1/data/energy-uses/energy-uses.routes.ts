import type { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { EnergyUseWorkbenchPanelComponent } from './energy-use-workbench/panel/energy-use-workbench-panel.component';

export const ENERGY_USE_WORKBENCH_ROUTES: Routes = [{
  path: 'energy-uses/:energyUseGuid', component: EnergyUseWorkbenchComponent,
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'settings' },
    { path: 'settings', component: EnergyUseWorkbenchPanelComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange', data: { energyUseTab: 'settings' } },
    { path: 'annual-data', component: EnergyUseWorkbenchPanelComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange', data: { energyUseTab: 'annual-data' } },
    { path: '**', redirectTo: 'settings' }
  ]
}];
