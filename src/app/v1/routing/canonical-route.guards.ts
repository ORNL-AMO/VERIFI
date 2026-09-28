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

  if (isAccountDataRoute(state) && !isAccountCustomDataRoute(state)) {
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
  const parts = accountRouteParts(state);
  const section = parts[3];
  const detail = parts[4];

  if (section === 'settings') {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail || 'profile'];
  }
  if (section === 'data' && isCustomDataDetail(detail)) {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail];
  }
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}

function isAccountDataRoute(state: RouterStateSnapshot): boolean {
  return accountRouteParts(state)[3] === 'data';
}

function isAccountCustomDataRoute(state: RouterStateSnapshot): boolean {
  const parts = accountRouteParts(state);
  return parts[3] === 'data' && isCustomDataDetail(parts[4]);
}

function accountRouteParts(state: RouterStateSnapshot): Array<string> {
  const path = state.url.split(/[?#]/, 1)[0];
  const parts = path.split('/').filter(Boolean);
  const workspaceIndex = parts.indexOf('workspace');
  return workspaceIndex >= 0 ? parts.slice(workspaceIndex) : [];
}

function isCustomDataDetail(detail: string | undefined): detail is string {
  return detail === 'custom-grid-factors' || detail === 'custom-fuels' || detail === 'custom-gwps';
}
