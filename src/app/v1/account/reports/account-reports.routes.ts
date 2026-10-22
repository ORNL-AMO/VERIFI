import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@app/v1/account/data/unsaved-changes.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';
import { AccountReportsLandingComponent } from './account-reports-landing/account-reports-landing.component';

export const ACCOUNT_REPORT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: AccountReportsDashboardComponent, canDeactivate: [unsavedChangesGuard] },
  { path: 'workbench/:reportGuid', children: [
    { path: '', pathMatch: 'full', redirectTo: 'setup' },
    { path: 'setup', component: AccountReportsLandingComponent, canDeactivate: [unsavedChangesGuard],
      runGuardsAndResolvers: 'always', canActivate: [() => inject(UnsavedChangesService).confirmDiscard()] },
    { path: '**', redirectTo: 'setup' }
  ] },
  { path: '**', redirectTo: 'dashboard' }
];
