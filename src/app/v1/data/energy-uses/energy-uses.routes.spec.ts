import { facilityEnergyUseGroupRoute, facilityEnergyUseRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { ENERGY_USE_WORKBENCH_ROUTES } from './energy-uses.routes';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';

describe('energy use route contract', () => {
  it('builds and parses canonical ownership and protects the combined setup destination', () => {
    const route = facilityEnergyUseRoute('facility-a', 'energy-a', 'settings');
    expect(route).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'data', 'energy-uses', 'energy-a', 'settings']);
    expect(ENERGY_USE_WORKBENCH_ROUTES.find(route => route.path === 'energy-uses/:energyUseGuid')!.children?.some(child => child.path === 'annual-data')).toBe(false);
    expect(parseWorkspaceRoute(route.join('/'))).toMatchObject({ facilityGuid: 'facility-a', energyUseGuid: 'energy-a', section: 'data', detail: 'energy-uses' });
    for (const tab of ['settings']) expect(ENERGY_USE_WORKBENCH_ROUTES.find(route => route.path === 'energy-uses/:energyUseGuid')!.children?.find(child => child.path === tab))
      .toMatchObject({ canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' });
  });
});

it('recognizes group routes without treating groups as equipment identifiers', () => {
  const route = facilityEnergyUseGroupRoute('facility-a', 'group-a');
  expect(parseWorkspaceRoute(route.join('/'))).toMatchObject({ facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a', energyUseGuid: undefined, detail: 'energy-uses' });
  expect(ENERGY_USE_WORKBENCH_ROUTES[0].path).toBe('energy-uses/groups/:energyUseGroupGuid');
});
