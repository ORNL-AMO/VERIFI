import { SetupGroupComponent } from './energy-use-workbench/setup-group/setup-group.component';
import type { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { EnergyUseSettingsComponent } from './energy-use-workbench/settings/energy-use-settings.component';

export const ENERGY_USE_WORKBENCH_ROUTES: Routes = [{
  path: 'energy-uses/groups/:energyUseGroupGuid', component: EnergyUseWorkbenchComponent,
  canDeactivate: [unsavedChangesGuard],
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'items' },
    { path: 'setup', component: SetupGroupComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' },
    { path: 'items', pathMatch: 'full', children: [] },
    { path: 'items/:energyUseGuid', component: EnergyUseSettingsComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' }
  ]
}];
