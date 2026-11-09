import { SetupGroupComponent } from './energy-use-workbench/setup-group/setup-group.component';
import type { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { EnergyUseSettingsComponent } from './energy-use-workbench/settings/energy-use-settings.component';
import { ResultsGraphsComponent } from './energy-use-workbench/results/graphs/results-graphs.component';
import { FacilityFootprintComponent } from './energy-use-workbench/results/facility-footprint/facility-footprint.component';

export const ENERGY_USE_WORKBENCH_ROUTES: Routes = [{
  path: 'energy-uses/groups/:energyUseGroupGuid', component: EnergyUseWorkbenchComponent,
  canDeactivate: [unsavedChangesGuard],
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'items' },
    { path: 'setup', component: SetupGroupComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' },
    { path: 'group-footprint', component: ResultsGraphsComponent },
    { path: 'group-summary', component: ResultsGraphsComponent },
    { path: 'facility-footprint', component: FacilityFootprintComponent },
    { path: 'table-results', pathMatch: 'full', redirectTo: 'group-summary' },
    { path: 'items', pathMatch: 'full', children: [] },
    { path: 'items/:energyUseGuid', component: EnergyUseSettingsComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' }
  ]
}];
