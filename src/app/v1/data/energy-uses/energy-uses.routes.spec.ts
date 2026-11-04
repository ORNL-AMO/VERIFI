import { facilityEnergyUseRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { ENERGY_USE_WORKBENCH_ROUTES } from './energy-uses.routes';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';

describe('energy use route contract', () => {
  it('builds and parses canonical ownership and protects both editable destinations', () => {
    const route = facilityEnergyUseRoute('facility-a', 'energy-a', 'annual-data');
    expect(route).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'data', 'energy-uses', 'energy-a', 'annual-data']);
    expect(parseWorkspaceRoute(route.join('/'))).toMatchObject({ facilityGuid: 'facility-a', energyUseGuid: 'energy-a', section: 'data', detail: 'energy-uses' });
    for (const tab of ['settings', 'annual-data']) expect(ENERGY_USE_WORKBENCH_ROUTES[0].children?.find(child => child.path === tab))
      .toMatchObject({ canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' });
  });
});
