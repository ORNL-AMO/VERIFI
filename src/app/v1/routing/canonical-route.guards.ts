import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { isPanelTab, PanelTabId } from '../shell/workspace-navigation.service';

const DEFAULT_PANEL_TAB: PanelTabId = 'help';

export const accountHomeCanonicalGuard: CanActivateFn = route => {
  const accountGuid = route.parent?.paramMap.get('accountGuid');
  if (!accountGuid) { return inject(Router).createUrlTree(['/v1']); }
  const panelTab = route.paramMap.get('panelTab');
  if (route.paramMap.get('detail') === 'overview' && isPanelTab(panelTab)) {
    return true;
  }
  return inject(Router).createUrlTree(accountHomeCommands(accountGuid, normalizePanelTab(panelTab)));
};

export const facilityHomeCanonicalGuard: CanActivateFn = route => {
  const facilityGuid = route.parent?.paramMap.get('facilityGuid');
  if (!facilityGuid) { return inject(Router).createUrlTree(['/v1']); }
  const panelTab = route.paramMap.get('panelTab');
  if (route.paramMap.get('detail') === 'overview' && isPanelTab(panelTab)) {
    return true;
  }
  return inject(Router).createUrlTree(facilityHomeCommands(facilityGuid, normalizePanelTab(panelTab)));
};

export function accountHomeCommands(accountGuid: string, panelTab: PanelTabId = DEFAULT_PANEL_TAB): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview', panelTab];
}

export function facilityHomeCommands(facilityGuid: string, panelTab: PanelTabId = DEFAULT_PANEL_TAB): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview', panelTab];
}

function normalizePanelTab(panelTab: string | null): PanelTabId {
  return isPanelTab(panelTab ?? undefined) ? panelTab as PanelTabId : DEFAULT_PANEL_TAB;
}
