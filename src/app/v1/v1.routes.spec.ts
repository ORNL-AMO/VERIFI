import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FacilityDataModule } from './facility/data/facility-data.module';
import { FacilityMetersComponent } from './facility/data/meters/facility-meters.component';
import { MeterWorkbenchMonthlyDataComponent } from './facility/data/meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from './facility/data/meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from './facility/data/meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from './facility/data/meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchComponent } from './facility/data/meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from './facility/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MetersDashboardComponent } from './facility/data/meters/meters-dashboard/meters-dashboard.component';
import { V1Routes } from './v1.routes';

describe('V1Routes facility data meters routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([]),
        FacilityDataModule
      ]
    });
  });

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
    const meterRoute = meterGuidRoute();
    const tabRoutes = meterRoute.children ?? [];

    expect(metersRoute.component).toBe(FacilityMetersComponent);
    expect(metersRoute.children?.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      component: MetersDashboardComponent
    });
    expect(meterRoute.component).toBe(MeterWorkbenchComponent);
    expect(tabRoutes.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'settings'
    });
    expect(tabRoute('settings')).toMatchObject({ component: MeterWorkbenchSettingsComponent, data: { meterTab: 'settings' } });
    expect(tabRoute('readings')).toMatchObject({ component: MeterWorkbenchReadingsComponent, data: { meterTab: 'readings' } });
    expect(tabRoute('monthly')).toMatchObject({ component: MeterWorkbenchMonthlyDataComponent, data: { meterTab: 'monthly' } });
    expect(tabRoute('yearly')).toMatchObject({ component: MeterWorkbenchYearlyDataComponent, data: { meterTab: 'yearly' } });
    expect(tabRoute('quality')).toMatchObject({ component: MeterWorkbenchQualityReportComponent, data: { meterTab: 'quality' } });
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

function tabRoute(path: string): Route {
  const route = meterGuidRoute().children?.find(child => child.path === path);
  if (!route) {
    throw new Error(`Meter workbench ${path} route was not found.`);
  }
  return route;
}
