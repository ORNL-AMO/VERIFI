import { Routes } from '@angular/router';
import { P1WorkspaceShellComponent } from './p1/components/workspace-shell/workspace-shell.component';
import { P1WelcomeScreenComponent } from './p1/components/welcome-screen/welcome-screen.component';
import { P1AccountEnergyUsesDataPageComponent } from './p1/pages/account-data-pages/account-energy-uses-data-page/account-energy-uses-data-page.component';
import { P1AccountEventsDataPageComponent } from './p1/pages/account-data-pages/account-events-data-page/account-events-data-page.component';
import { P1AccountMetersDataPageComponent } from './p1/pages/account-data-pages/account-meters-data-page/account-meters-data-page.component';
import { P1AccountPredictorsDataPageComponent } from './p1/pages/account-data-pages/account-predictors-data-page/account-predictors-data-page.component';
import { P1AccountPlaceholderPageComponent } from './p1/pages/account-placeholder-page/account-placeholder-page.component';
import { P1AccountSettingsPageComponent } from './p1/pages/account-settings-page/account-settings-page.component';
import { P1FacilityEnergyUsesDataPageComponent } from './p1/pages/facility-data-pages/facility-energy-uses-data-page/facility-energy-uses-data-page.component';
import { P1FacilityEventsDataPageComponent } from './p1/pages/facility-data-pages/facility-events-data-page/facility-events-data-page.component';
import { P1FacilityMetersDataPageComponent } from './p1/pages/facility-data-pages/facility-meters-data-page/facility-meters-data-page.component';
import { P1FacilityPredictorsDataPageComponent } from './p1/pages/facility-data-pages/facility-predictors-data-page/facility-predictors-data-page.component';
import { P1FacilityPlaceholderPageComponent } from './p1/pages/facility-placeholder-page/facility-placeholder-page.component';
import { P1FacilitySettingsPageComponent } from './p1/pages/facility-settings-page/facility-settings-page.component';
import { P1Component } from './p1/p1.component';
import { P1RouteFacade } from './p1/p1-route.facade';
import { PrototypeShellComponent } from './prototype-shell/prototype-shell.component';

export const PrototypeRoutes: Routes = [
  {
    path: 'p1',
    component: PrototypeShellComponent,
    children: [
      {
        path: '',
        component: P1Component,
        providers: [P1RouteFacade],
        children: [
          { path: '', component: P1WelcomeScreenComponent },
          { path: 'workspace', pathMatch: 'full', redirectTo: 'workspace/account/home/overview/help' },
          { path: 'workspace/account', pathMatch: 'full', redirectTo: 'workspace/account/home/overview/help' },
          {
            path: 'workspace/account/data/meters/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountMetersDataPageComponent }]
          },
          {
            path: 'workspace/account/data/predictors/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountPredictorsDataPageComponent }]
          },
          {
            path: 'workspace/account/data/energy-uses/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountEnergyUsesDataPageComponent }]
          },
          {
            path: 'workspace/account/data/events/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountEventsDataPageComponent }]
          },
          {
            path: 'workspace/account/settings/:detail/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountSettingsPageComponent }]
          },
          {
            path: 'workspace/account/:section',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountPlaceholderPageComponent }]
          },
          {
            path: 'workspace/account/:section/:detail',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountPlaceholderPageComponent }]
          },
          {
            path: 'workspace/account/:section/:detail/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1AccountPlaceholderPageComponent }]
          },
          { path: 'workspace/facility/:facilityGuid', pathMatch: 'full', redirectTo: 'workspace/facility/:facilityGuid/home/overview/help' },
          {
            path: 'workspace/facility/:facilityGuid/data/meters/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityMetersDataPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/data/predictors/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityPredictorsDataPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/data/energy-uses/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityEnergyUsesDataPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/data/events/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityEventsDataPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/settings/:detail/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilitySettingsPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/:section',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityPlaceholderPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/:section/:detail',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityPlaceholderPageComponent }]
          },
          {
            path: 'workspace/facility/:facilityGuid/:section/:detail/:panelTab',
            component: P1WorkspaceShellComponent,
            children: [{ path: '', component: P1FacilityPlaceholderPageComponent }]
          },
          { path: 'workspace/**', redirectTo: 'workspace/account/home/overview/help' },
          { path: '**', redirectTo: '' }
        ]
      }
    ]
  }
];
