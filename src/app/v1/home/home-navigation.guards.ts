import { HomeViewResolver } from './home-view-resolver.service';
import { homeEntryKey } from './home-view-resolver.service';
import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { homeRouteOwner } from './home-route-owner';
import { HomeEditor } from './home-editor.service';

/** Resolve entry once to an explicit identity so later default changes cannot replace an open draft. */
export const homeDefaultGuard: CanActivateFn = (_route, state) => {
  const store = inject(AccountWorkspaceStore), account = store.account();
  if (!store.isReady() || !account) return true;
  const route = parseWorkspaceRoute(state.url);
  const owner = homeRouteOwner(account, store.facilities(), route);
  if (!owner || route.detail !== 'overview') return true;
  const resolved = inject(HomeViewResolver).resolve(owner);
  const entry = resolved.default && resolved.entries.find(item => item.key === homeEntryKey(resolved.default!));
  return entry ? inject(Router).createUrlTree(entry.route) : true;
};
export const homeLeaveGuard: CanDeactivateFn<unknown> = () => inject(HomeEditor).resolveLeave();
