import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { parseWorkspaceRoute } from './workspace-navigation.service';

/** Query-only scope changes reuse inventory components, so they must explicitly guard their editors. */
export const inventoryScopeChangeGuard: CanActivateChildFn = async (_route, next) => {
  const router = inject(Router);
  const workspace = inject(AccountWorkspaceStore);
  const changes = inject(UnsavedChangesService);
  const current = parseWorkspaceRoute(router.url);
  const target = parseWorkspaceRoute(next.url);
  const inventory = current.contextMode === 'account' && (current.detail === 'portfolio'
    || ((current.section === 'reports' || current.section === 'analysis') && current.detail === 'dashboard'));
  const scopeGuid = (url: string) => {
    const guid = router.parseUrl(url).queryParamMap.get('facility');
    return workspace.facilities().some(facility => facility.guid === guid && facility.accountId === current.accountGuid) ? guid : undefined;
  };
  // Removing an unavailable scope is URL cleanup: the inventory already projects All facilities.
  if (!inventory || current.accountGuid !== target.accountGuid || scopeGuid(router.url) === scopeGuid(next.url)) return true;
  return !workspace.hasPending() && await changes.flushPendingChanges() && changes.confirmDiscard();
};
