import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { visualizationDashboardRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';
import { protectedNavigationPreflightGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { LibraryComponent, libraryLeaveGuard } from './library/library.component';
import { WorkbenchComponent, visualizationLeaveGuard } from './workbench/workbench.component';

export const VISUALIZATION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: LibraryComponent, canActivate: [protectedNavigationPreflightGuard], canDeactivate: [libraryLeaveGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  { path: 'workbench/:visualizationGuid', component: WorkbenchComponent, canActivate: [protectedNavigationPreflightGuard], canDeactivate: [visualizationLeaveGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  { path: '**', redirectTo: 'dashboard' }
];

/** Facility links are aliases to the account-owned Dashboard and workbench. */
export const visualizationFacilityEntryGuard: CanActivateFn = route => {
  const workspace = inject(AccountWorkspaceStore), router = inject(Router);
  const accountGuid = workspace.account()?.guid;
  const facilityGuid = route.pathFromRoot.map(item => item.paramMap.get('facilityGuid')).find(Boolean);
  if (!accountGuid || !facilityGuid) return router.createUrlTree(['/v1']);
  const guid = route.paramMap.get('visualizationGuid');
  return router.createUrlTree(guid ? visualizationWorkbenchRoute(accountGuid, guid) : visualizationDashboardRoute(accountGuid),
    { queryParams: guid ? {} : { facility: facilityGuid } });
};
