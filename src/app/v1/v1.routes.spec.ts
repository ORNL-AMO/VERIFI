import { Route } from '@angular/router';
import { FacilityMetersComponent } from './facility/data/meters/facility-meters.component';
import { V1Routes } from './v1.routes';

describe('V1Routes facility data meters routes', () => {
  it('defaults Facility Data to Meters', () => {
    const dataRoute = facilityDataRoute();
    const defaultRoute = dataRoute.children?.find(route => route.path === '');

    expect(defaultRoute).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'meters'
    });
  });

  it('routes Meters to the landing page and deep-linked workbench tabs', () => {
    const metersRoute = metersRouteConfig();
    const tabRoutes = meterGuidRoute().children ?? [];

    expect(metersRoute.children?.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      component: FacilityMetersComponent
    });
    expect(tabRoutes.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'settings'
    });
    expect(tabRoutes.filter(route => route.component === FacilityMetersComponent).map(route => route.path)).toEqual([
      'settings',
      'readings',
      'monthly',
      'yearly',
      'quality'
    ]);
  });

  it('redirects invalid meter workbench tabs to Settings', () => {
    const wildcardRoute = meterGuidRoute().children?.find(route => route.path === '**');

    expect(wildcardRoute).toMatchObject({
      path: '**',
      redirectTo: 'settings'
    });
  });
});

function facilityDataRoute(): Route {
  const shellRoute = V1Routes[0];
  const facilityRoute = shellRoute.children?.find(route => route.path === 'workspace/facility/:facilityGuid');
  const dataRoute = facilityRoute?.children?.find(route => route.path === 'data');
  if (!dataRoute) {
    throw new Error('Facility Data route was not found.');
  }
  return dataRoute;
}

function metersRouteConfig(): Route {
  const route = facilityDataRoute().children?.find(child => child.path === 'meters');
  if (!route) {
    throw new Error('Facility Data Meters route was not found.');
  }
  return route;
}

function meterGuidRoute(): Route {
  const route = metersRouteConfig().children?.find(child => child.path === ':meterGuid');
  if (!route) {
    throw new Error('Facility Data Meters workbench route was not found.');
  }
  return route;
}
