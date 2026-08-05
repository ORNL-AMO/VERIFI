import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { AccountWorkspaceService } from '../account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { ApplicationLifecycleService } from '../application-lifecycle/application-lifecycle.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';

const PUBLIC_NESTED_PATHS = new Set(['privacy', 'about', 'acknowledgments', 'feedback', 'help']);

export const persistenceReadyGuard: CanActivateFn = async () => {
  return ensurePersistenceReady();
};

export const accountReadyGuard: CanActivateFn = async () => {
  return ensureActiveAccountWorkspace();
};

export const accountGuidReadyGuard: CanActivateFn = async route => {
  return ensureActiveAccountWorkspace(route.paramMap.get('id') ?? undefined);
};

export const dataManagementChildGuard: CanActivateChildFn = async (route, state) => {
  if (isPublicNestedRoute(state)) {
    return ensurePersistenceReady();
  }
  return ensureActiveAccountWorkspace(findDataManagementAccountGuid(route));
};

export const facilityReadyGuard: CanActivateFn = async route => {
  const lifecycle = inject(ApplicationLifecycleService);
  const workspace = inject(AccountWorkspaceService);
  const store = inject(AccountWorkspaceStore);
  const facilities = inject(FacilitydbService);
  const router = inject(Router);

  const startup = await lifecycle.initialize();
  if (startup.status === 'error') { return false; }
  if (startup.status === 'empty') { return accountManagement(router); }

  const facilityGuid = route.paramMap.get('id');
  if (!facilityGuid) { return activeAccountHome(router, route); }
  const facility = await facilities.getStoredByGuid(facilityGuid);
  if (!facility?.accountId) { return activeAccountHome(router, route); }

  const dataManagementAccountGuid = findDataManagementAccountGuid(route);
  if (dataManagementAccountGuid && facility.accountId !== dataManagementAccountGuid) {
    return activeAccountHome(router, route);
  }

  const owner = lifecycle.usableAccounts().find(account => account.guid === facility.accountId);
  if (!owner) { return activeAccountHome(router, route); }
  try {
    if (store.account()?.guid !== owner.guid) {
      const result = await workspace.selectAccount(owner.guid);
      if (result === 'superseded') { return false; }
    }
    const publishedFacility = store.facilities().find(item => item.guid === facilityGuid);
    if (!publishedFacility || publishedFacility.accountId !== owner.guid) {
      return activeAccountHome(router, route);
    }
    workspace.selectFacility(facilityGuid);
    return true;
  } catch {
    return activeAccountHome(router, route);
  }
};

async function ensurePersistenceReady(): Promise<boolean> {
  const lifecycle = inject(ApplicationLifecycleService);
  await lifecycle.initialize();
  return lifecycle.persistenceReady();
}

async function ensureActiveAccountWorkspace(accountGuid?: string): Promise<boolean | UrlTree> {
  const lifecycle = inject(ApplicationLifecycleService);
  const workspace = inject(AccountWorkspaceService);
  const store = inject(AccountWorkspaceStore);
  const router = inject(Router);

  const startup = await lifecycle.initialize();
  if (startup.status === 'error') { return false; }
  if (startup.status === 'empty') { return accountManagement(router); }

  if (!accountGuid) {
    return store.isReady() ? true : accountManagement(router);
  }
  const account = lifecycle.usableAccounts().find(item => item.guid === accountGuid);
  if (!account) { return accountManagement(router); }
  if (store.account()?.guid === accountGuid && store.isReady()) { return true; }

  try {
    const result = await workspace.selectAccount(accountGuid);
    return result === 'published' ? true : false;
  } catch {
    return accountManagement(router);
  }
}

function findDataManagementAccountGuid(route: ActivatedRouteSnapshot): string | undefined {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    if (current.routeConfig?.path === 'data-management/:id') {
      return current.paramMap.get('id') ?? undefined;
    }
    current = current.parent;
  }
  return undefined;
}

function isPublicNestedRoute(state: RouterStateSnapshot): boolean {
  const path = state.url.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1);
  return path ? PUBLIC_NESTED_PATHS.has(path) : false;
}

function accountManagement(router: Router): UrlTree {
  return router.createUrlTree(['/manage-accounts']);
}

function activeAccountHome(router: Router, route: ActivatedRouteSnapshot): UrlTree {
  const accountGuid = findDataManagementAccountGuid(route);
  if (accountGuid) {
    return router.createUrlTree(['/data-management', accountGuid, 'home']);
  }
  return router.createUrlTree(['/data-evaluation/account/home']);
}
