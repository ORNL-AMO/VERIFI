import { Routes } from '@angular/router';
import { accountGuidReadyGuard, facilityReadyGuard, persistenceReadyGuard } from '@app/routing/workspace-readiness.guards';
import { AccountHomeComponent } from './account/home/account-home.component';
import { AccountSettingsComponent } from './account/settings/account-settings.component';
import { AccountSettingsBackupComponent } from './account/settings/backup/account-settings-backup.component';
import { AccountSettingsFinancialComponent } from './account/settings/financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from './account/settings/goals/account-settings-goals.component';
import { AccountSettingsProfileComponent } from './account/settings/profile/account-settings-profile.component';
import { AccountSettingsStalenessComponent } from './account/settings/staleness/account-settings-staleness.component';
import { AccountSettingsUnitsComponent } from './account/settings/units/account-settings-units.component';
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
      { path: '', component: WelcomeComponent, canActivate: [persistenceReadyGuard]},
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
          {
            path: 'settings',
            component: AccountSettingsComponent,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'profile' },
              { path: 'profile', component: AccountSettingsProfileComponent },
              { path: 'units', component: AccountSettingsUnitsComponent },
              { path: 'goals', component: AccountSettingsGoalsComponent },
              { path: 'financial', component: AccountSettingsFinancialComponent },
              { path: 'staleness', component: AccountSettingsStalenessComponent },
              { path: 'backup', component: AccountSettingsBackupComponent },
              { path: '**', redirectTo: 'profile' }
            ]
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
