import { Routes } from '@angular/router';
import { P1WorkspaceShellComponent } from './p1/components/workspace-shell/workspace-shell.component';
import { P1WelcomeScreenComponent } from './p1/components/welcome-screen/welcome-screen.component';
import { P1AccountPlaceholderPageComponent } from './p1/pages/account-placeholder-page/account-placeholder-page.component';
import { P1FacilityPlaceholderPageComponent } from './p1/pages/facility-placeholder-page/facility-placeholder-page.component';
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
