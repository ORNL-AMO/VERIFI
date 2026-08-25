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
          { path: '', pathMatch: 'full', redirectTo: 'home/overview' },
          { path: 'home', pathMatch: 'full', redirectTo: 'home/overview' },
          {
            path: 'home/:detail',
            component: AccountHomeComponent,
            canActivate: [accountHomeCanonicalGuard]
          },
          { path: '**', redirectTo: 'home/overview' }
        ]
      },
      {
        path: 'workspace/facility/:facilityGuid',
        component: WorkspaceShellComponent,
        canActivate: [facilityReadyGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'home/overview' },
          { path: 'home', pathMatch: 'full', redirectTo: 'home/overview' },
          {
            path: 'home/:detail',
            component: FacilityHomeComponent,
            canActivate: [facilityHomeCanonicalGuard]
          },
          { path: '**', redirectTo: 'home/overview' }
        ]
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
