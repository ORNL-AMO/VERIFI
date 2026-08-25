import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

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

export function accountHomeCommands(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview'];
}

export function facilityHomeCommands(facilityGuid: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}
