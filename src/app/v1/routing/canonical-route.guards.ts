import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { SingleFacilityAnalysisPairService } from '@app/v1/facility/analysis/single-facility-analysis-pair.service';

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

export const singleSiteAccountRedirectGuard: CanActivateFn = async (_route, state) => {
  const store = inject(AccountWorkspaceStore);
  const router = inject(Router);
  const account = store.account();
  const facilities = store.facilities();
  if (account?.isSingleFacilityCompany !== true || facilities.length !== 1) {
    return true;
  }

  // Reports retain account scope even for a single-facility workspace.
  if (accountRouteParts(state)[3] === 'reports') return true;

  await inject(SingleFacilityAnalysisPairService).ensurePairs();
  if (isAccountDataRoute(state) && !isAccountCustomDataRoute(state)) {
    return true;
  }

  const commands = singleSiteRedirectCommands(
    state,
    facilities[0].guid,
    store.accountAnalyses()
  );
  return router.createUrlTree(commands);
};

export function accountHomeCommands(accountGuid: string): Array<string> {
  return ['/v1', 'workspace', 'account', accountGuid, 'home', 'overview'];
}

export function facilityHomeCommands(facilityGuid: string): Array<string> {
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}

export function singleSiteRedirectCommands(
  state: RouterStateSnapshot,
  facilityGuid: string,
  accountAnalyses: readonly IdbAccountAnalysisItem[] = []
): Array<string> {
  const parts = accountRouteParts(state);
  const section = parts[3];
  const detail = parts[4];

  if (section === 'settings') {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail || 'profile'];
  }
  if (section === 'data' && isCustomDataDetail(detail)) {
    return ['/v1', 'workspace', 'facility', facilityGuid, 'data', detail];
  }
  if (section === 'analysis') {
    if (detail !== 'workbench') {
      return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'dashboard'];
    }
    const pair = accountAnalyses.find(item => item.guid === parts[5]);
    const facilityAnalysisGuid = pair?.facilityAnalysisItems?.length === 1
      && pair.facilityAnalysisItems[0].facilityId === facilityGuid
        ? pair.facilityAnalysisItems[0].analysisItemId
        : undefined;
    if (!facilityAnalysisGuid) {
      return ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'dashboard'];
    }
    return facilityAnalysisWorkbenchCommands(parts, facilityGuid, facilityAnalysisGuid);
  }
  return ['/v1', 'workspace', 'facility', facilityGuid, 'home', 'overview'];
}

function facilityAnalysisWorkbenchCommands(
  accountRoute: readonly string[],
  facilityGuid: string,
  facilityAnalysisGuid: string
): Array<string> {
  const base = ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', facilityAnalysisGuid];
  const accountStage = accountRoute[6];
  const accountResult = accountRoute[7];
  if (accountStage === 'used-by') return [...base, 'used-by'];
  if (accountStage !== 'results') return [...base, 'setup'];
  if (accountResult === 'monthly-table' || accountResult === 'monthly-chart') {
    return [...base, 'facility', accountResult];
  }
  return [...base, 'facility', 'annual'];
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
