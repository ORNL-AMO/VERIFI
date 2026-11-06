import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

/** Keep old facility inventory links while using one scoped inventory implementation. */
export const energyUseInventoryRedirectGuard: CanActivateFn = route => {
  const workspace = inject(AccountWorkspaceStore);
  const router = inject(Router);
  const navigation = inject(WorkspaceNavigationService);
  const facilityGuid = route.pathFromRoot.map(route => route.paramMap.get('facilityGuid')).find(Boolean);
  const facility = workspace.facilities().find(facility => facility.guid === facilityGuid && facility.accountId === workspace.account()?.guid);
  if (!facility) return router.createUrlTree(['/v1']);
  const destination = navigation.facilityInventoryLink(facility.guid, 'energy-uses');
  return router.createUrlTree(destination.route, { queryParams: destination.queryParams });
};
