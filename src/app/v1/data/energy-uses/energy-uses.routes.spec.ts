import { facilityEnergyUseGroupRoute, facilityEnergyUseRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { ENERGY_USE_WORKBENCH_ROUTES } from './energy-uses.routes';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';

describe('energy use group route contract', () => {
  it('builds and parses group and item ownership and protects item transitions', () => {
    const route = facilityEnergyUseRoute('facility-a', 'group-a', 'energy-a');
    expect(route).toEqual([...facilityEnergyUseGroupRoute('facility-a', 'group-a'), 'items', 'energy-a']);
    expect(parseWorkspaceRoute(route.join('/'))).toMatchObject({ facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a', energyUseGuid: 'energy-a', section: 'data', detail: 'energy-uses' });
    expect(ENERGY_USE_WORKBENCH_ROUTES[0]).toMatchObject({ component: EnergyUseWorkbenchComponent, canDeactivate: [unsavedChangesGuard] });
    expect(ENERGY_USE_WORKBENCH_ROUTES[0].children?.find(child => child.path === 'items/:energyUseGuid'))
      .toMatchObject({ canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' });
  });
  it('does not parse removed item URLs as workbench identities', () => {
    expect(parseWorkspaceRoute('/v1/workspace/facility/facility-a/data/energy-uses/energy-a/settings').energyUseGuid).toBeUndefined();
    expect(ENERGY_USE_WORKBENCH_ROUTES).toHaveLength(1);
    expect(ENERGY_USE_WORKBENCH_ROUTES[0].children?.some(child => child.path === 'history')).toBe(false);
  });
  it('redirects the removed table destination to Group Summary', () => {
    expect(ENERGY_USE_WORKBENCH_ROUTES[0].children?.find(child => child.path === 'table-results'))
      .toMatchObject({ redirectTo: 'group-summary', pathMatch: 'full' });
  });
  it.each(['group-summary', 'group-footprint', 'facility-footprint'])('retains group ownership without selecting an item on %s', tab => {
    const route = [...facilityEnergyUseGroupRoute('facility-a', 'group-a'), tab];
    expect(parseWorkspaceRoute(route.join('/'))).toMatchObject({ facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a', energyUseGuid: undefined });
    expect(ENERGY_USE_WORKBENCH_ROUTES[0].children?.find(child => child.path === tab)?.component).toBeDefined();
  });
});
