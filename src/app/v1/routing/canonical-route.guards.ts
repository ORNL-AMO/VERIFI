import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

export const accountHomeCanonicalGuard: CanActivateFn = route => {
  const accountGuid = route.parent?.paramMap.get('accountGuid');
  if (!accountGuid) { return inject(Router).createUrlTree(['/v1']); }
  if (route.paramMap.get('detail') === 'overview') {
    return true;
  }
  return inject(Router).createUrlTree(accountHomeCommands(accountGuid));
};

export const facilityHomeCanonicalGuard: CanActivateFn = route => {
  const facilityGuid = route.parent?.paramMap.get('facilityGuid');
  if (!facilityGuid) { return inject(Router).createUrlTree(['/v1']); }
  if (route.paramMap.get('detail') === 'overview') {
    return true;
  }
  return inject(Router).createUrlTree(facilityHomeCommands(facilityGuid));
};

export const singleSiteAccountRedirectGuard: CanActivateFn = (_route, state) => {
  const store = inject(AccountWorkspaceStore);
  const account = store.account();
  const facilities = store.facilities();
  if (account?.isSingleFacilityCompany !== true || facilities.length !== 1) {
    return true;
  }

  const commands = singleSiteRedirectCommands(state, facilities[0].guid);
  return inject(Router).createUrlTree(commands);
};

export function accountHomeCommands(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview'];
}

export function facilityHomeCommands(facilityGuid: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}

export function singleSiteRedirectCommands(state: RouterStateSnapshot, facilityGuid: string): Array<string> {
  const path = state.url.split(/[?#]/, 1)[0];
  const parts = path.split('/').filter(Boolean);
  const workspaceIndex = parts.indexOf('workspace');
  const accountRouteParts = workspaceIndex >= 0 ? parts.slice(workspaceIndex) : [];
  const section = accountRouteParts[3];
  const detail = accountRouteParts[4];

  if (section === 'settings') {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail || 'profile'];
  }
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}
