import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { RouterModule } from '@angular/router';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { AccountPortfolioAnalysesTabComponent } from '@app/v1/account/portfolio/account-portfolio-analyses-tab/account-portfolio-analyses-tab.component';
import { AccountPortfolioComponent } from '@app/v1/account/portfolio/account-portfolio.component';
import { AccountPortfolioEnergyUsesTabComponent } from '@app/v1/account/portfolio/account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from '@app/v1/account/portfolio/account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from '@app/v1/account/portfolio/account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPredictorsTabComponent } from '@app/v1/account/portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { AccountPortfolioReportsTabComponent } from '@app/v1/account/portfolio/account-portfolio-reports-tab/account-portfolio-reports-tab.component';
import { FacilityDataModule } from '@app/v1/facility/data/facility-data.module';
import { FacilityMetersComponent } from '@app/v1/facility/data/meters/facility-meters.component';
import { MeterWorkbenchBillInspectionComponent } from '@app/v1/facility/data/meters/meter-workbench/bill-inspection/meter-workbench-bill-inspection.component';
import { MeterWorkbenchMonthlyChartComponent } from '@app/v1/facility/data/meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from '@app/v1/facility/data/meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from '@app/v1/facility/data/meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from '@app/v1/facility/data/meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterWorkbenchSettingsComponent } from '@app/v1/facility/data/meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterWorkbenchComponent } from '@app/v1/facility/data/meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from '@app/v1/facility/data/meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterGroupWorkbenchGraphComponent } from '@app/v1/facility/data/meters/meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchTableComponent } from '@app/v1/facility/data/meters/meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchYearlyDataComponent } from '@app/v1/facility/data/meters/meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MeterGroupWorkbenchComponent } from '@app/v1/facility/data/meters/meter-group-workbench/meter-group-workbench.component';
import { MeterGroupingComponent } from '@app/v1/facility/data/meters/meter-grouping/meter-grouping.component';
import { MetersDashboardComponent } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard.component';
import { V1Routes } from './v1.routes';

describe('V1Routes facility data meters routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        AccountDataModule,
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

  it('routes Account Portfolio tabs as child workspaces', () => {
    const route = accountPortfolioRoute();
    const children = route.children ?? [];

    expect(route.component).toBe(AccountPortfolioComponent);
    expect(children.find(child => child.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'facilities'
    });
    expect(children.find(child => child.path === 'facilities')).toMatchObject({ component: AccountPortfolioFacilitiesTabComponent });
    expect(children.find(child => child.path === 'meters')).toMatchObject({ component: AccountPortfolioMetersTabComponent });
    expect(children.find(child => child.path === 'predictors')).toMatchObject({ component: AccountPortfolioPredictorsTabComponent });
    expect(children.find(child => child.path === 'energy-uses')).toMatchObject({ component: AccountPortfolioEnergyUsesTabComponent });
    expect(children.find(child => child.path === 'analyses')).toMatchObject({ component: AccountPortfolioAnalysesTabComponent });
    expect(children.find(child => child.path === 'reports')).toMatchObject({ component: AccountPortfolioReportsTabComponent });
    expect(children.find(child => child.path === '**')).toMatchObject({
      path: '**',
      redirectTo: 'facilities'
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
    expect(tabRoute('bill-inspection')).toMatchObject({ component: MeterWorkbenchBillInspectionComponent, data: { meterTab: 'bill-inspection' } });
    expect(tabRoute('monthly')).toMatchObject({ component: MeterWorkbenchMonthlyDataComponent, data: { meterTab: 'monthly' } });
    expect(tabRoute('monthly-chart')).toMatchObject({ component: MeterWorkbenchMonthlyChartComponent, data: { meterTab: 'monthly-chart' } });
    expect(tabRoute('yearly')).toMatchObject({ component: MeterWorkbenchYearlyDataComponent, data: { meterTab: 'yearly' } });
    expect(tabRoute('quality')).toMatchObject({ component: MeterWorkbenchQualityReportComponent, data: { meterTab: 'quality' } });
  });

  it('routes Meter Grouping as a separate Facility Data section', () => {
    const groupingRoute = facilityDataRoute().children?.find(child => child.path === 'meter-grouping');
    const groupingLandingRoute = groupingRoute?.children?.find(child => child.path === '');
    const groupRoute = groupingRoute?.children?.find(child => child.path === ':groupGuid');
    const groupChildren = groupRoute?.children ?? [];

    expect(groupingRoute).toMatchObject({
      path: 'meter-grouping',
      component: FacilityMetersComponent
    });
    expect(groupingLandingRoute).toMatchObject({
      path: '',
      pathMatch: 'full',
      component: MeterGroupingComponent
    });
    expect(groupRoute?.component).toBe(MeterGroupWorkbenchComponent);
    expect(groupChildren.find(route => route.path === '')).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'monthly-table'
    });
    expect(groupChildren.find(route => route.path === 'monthly-table')).toMatchObject({
      component: MeterGroupWorkbenchTableComponent,
      data: { meterGroupTab: 'monthly-table', meterGroupPeriod: 'monthly' }
    });
    expect(groupChildren.find(route => route.path === 'monthly-chart')).toMatchObject({
      component: MeterGroupWorkbenchGraphComponent,
      data: { meterGroupTab: 'monthly-chart', meterGroupPeriod: 'monthly' }
    });
    expect(groupChildren.find(route => route.path === 'monthly-graph')).toMatchObject({
      redirectTo: 'monthly-chart'
    });
    expect(groupChildren.find(route => route.path === 'yearly')).toMatchObject({
      component: MeterGroupWorkbenchYearlyDataComponent,
      data: { meterGroupTab: 'yearly', meterGroupPeriod: 'yearly' }
    });
    expect(groupChildren.find(route => route.path === 'yearly-table')).toMatchObject({
      redirectTo: 'yearly'
    });
    expect(groupChildren.find(route => route.path === 'yearly-graph')).toMatchObject({
      redirectTo: 'yearly'
    });
  });

  it('redirects invalid meter workbench tabs to Settings', () => {
    const wildcardRoute = meterGuidRoute().children?.find(route => route.path === '**');

    expect(wildcardRoute).toMatchObject({
      path: '**',
      redirectTo: 'settings'
    });
  });
});

function accountDataRoute(): Route {
  const shellRoute = V1Routes[0];
  const accountRoute = shellRoute.children?.find(route => route.path === 'workspace/account/:accountGuid');
  const dataRoute = accountRoute?.children?.find(route => route.path === 'data');
  if (!dataRoute) {
    throw new Error('Account Data route was not found.');
  }
  return dataRoute;
}

function accountPortfolioRoute(): Route {
  const route = accountDataRoute().children?.find(child => child.path === 'portfolio');
  if (!route) {
    throw new Error('Account Portfolio route was not found.');
  }
  return route;
}

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
