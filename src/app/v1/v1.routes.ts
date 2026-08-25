import { Routes } from '@angular/router';
import { accountGuidReadyGuard, facilityReadyGuard, persistenceReadyGuard } from '@app/routing/workspace-readiness.guards';
import { AccountHomeComponent } from './account/home/account-home.component';
import { FacilityHomeComponent } from './facility/home/facility-home.component';
import { accountHomeCanonicalGuard, facilityHomeCanonicalGuard } from './routing/canonical-route.guards';
import { ShellComponent } from './shell/shell.component';
import { WorkspaceShellComponent } from './shell/workspace-shell/workspace-shell.component';
import { WelcomeComponent } from './welcome/welcome.component';

export const V1Routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', component: WelcomeComponent, canActivate: [persistenceReadyGuard] },
      { path: 'workspace', pathMatch: 'full', redirectTo: '' },
      {
        path: 'workspace/account/:accountGuid',
        component: WorkspaceShellComponent,
        canActivate: [accountGuidReadyGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'home/overview/help' },
          { path: 'home', pathMatch: 'full', redirectTo: 'home/overview/help' },
          { path: 'home/:detail', pathMatch: 'full', redirectTo: 'home/:detail/help' },
          {
            path: 'home/:detail/:panelTab',
            component: AccountHomeComponent,
            canActivate: [accountHomeCanonicalGuard]
          },
          { path: '**', redirectTo: 'home/overview/help' }
        ]
      },
      {
        path: 'workspace/facility/:facilityGuid',
        component: WorkspaceShellComponent,
        canActivate: [facilityReadyGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'home/overview/help' },
          { path: 'home', pathMatch: 'full', redirectTo: 'home/overview/help' },
          { path: 'home/:detail', pathMatch: 'full', redirectTo: 'home/:detail/help' },
          {
            path: 'home/:detail/:panelTab',
            component: FacilityHomeComponent,
            canActivate: [facilityHomeCanonicalGuard]
          },
          { path: '**', redirectTo: 'home/overview/help' }
        ]
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
