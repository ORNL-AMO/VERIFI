import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { homeDashboardVisible } from '@data/home/home-references';
import { homeDashboardRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { homeRouteOwner } from './home-route-owner';
import { HomeEditor } from './home-editor.service';

/** Resolve entry once to an explicit identity so later default changes cannot replace an open draft. */
export const homeDefaultGuard: CanActivateFn = (_route, state) => {
  const store = inject(AccountWorkspaceStore), account = store.account();
  if (!store.isReady() || !account) return true;
  const route = parseWorkspaceRoute(state.url);
  const owner = homeRouteOwner(account, store.facilities(), route);
  if (!owner || route.detail !== 'overview') return true;
  const view = inject(HomeCommands).ownerView(owner);
  const guid = view.defaultDashboardGuid ?? view.records.find(record => homeDashboardVisible(record, { account, meters: store.meters() }))?.guid;
  return guid ? inject(Router).createUrlTree(homeDashboardRoute(owner, guid)) : true;
};
export const homeLeaveGuard: CanDeactivateFn<unknown> = () => inject(HomeEditor).resolveLeave();
