import { singleFacilityPresentation } from '@app/v1/shared/navigation/single-facility-presentation';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { SingleFacilityAnalysisPairService } from '@app/v1/analysis/single-facility-analysis-pair.service';

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

export const singleSiteAccountRedirectGuard: CanActivateChildFn = async (_route, state) => {
  const store = inject(AccountWorkspaceStore);
  const router = inject(Router);
  const account = store.account();
  const facility = singleFacilityPresentation(account, store.facilities(), store.status() === 'ready');
  if (!facility) {
    return true;
  }

  // Reports and Upload retain account scope even for a single-facility workspace.
  const parts = accountRouteParts(state);
  const section = parts[3];
  if (section === 'reports' || section === 'imports' || (section === 'settings' && parts[4] === 'backup')) return true;

  await inject(SingleFacilityAnalysisPairService).ensurePairs();

  const commands = singleSiteRedirectCommands(
    state,
    facility.guid,
    store.accountAnalyses()
  );
  return commands ? router.createUrlTree(commands) : true;
};

/** Single-site Backup is the complete account backup; portfolio facility tools retain their route. */
export const singleFacilityBackupCanonicalGuard: CanActivateFn = route => {
  const store = inject(AccountWorkspaceStore);
  const facility = singleFacilityPresentation(store.account(), store.facilities(), store.status() === 'ready');
  const facilityGuid = route.pathFromRoot.map(item => item.paramMap.get('facilityGuid')).find(Boolean);
  return facility && facility.guid === facilityGuid
    ? inject(Router).createUrlTree(['/v1', 'workspace', 'account', facility.accountId, 'settings', 'backup']) : true;
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
): Array<string> | undefined {
  const parts = accountRouteParts(state);
  const section = parts[3];
  const detail = parts[4];
  const accountGuid = parts[2];

  if (section === 'settings') {
    if (detail === 'backup') return undefined;
    return ['/v1', 'workspace', 'facility', facilityGuid, 'settings', detail || 'profile'];
  }
  if (section === 'data') {
    const tab = detail === 'portfolio' ? parts[5] : undefined;
    if (detail === 'portfolio' && (tab === 'meters' || tab === 'predictors')) return undefined;
    if (isCustomDataDetail(detail) || tab === 'energy-uses') {
      return ['/v1', 'workspace', 'facility', facilityGuid, 'data', tab === 'energy-uses' ? tab : detail];
    }
    return ['/v1', 'workspace', 'account', accountGuid, 'data', 'portfolio', 'meters'];
  }
  if (section === 'analysis') {
    if (detail !== 'workbench') {
      return detail === 'dashboard' ? undefined : ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'dashboard'];
    }
    const pair = accountAnalyses.find(item => item.guid === parts[5]);
    const facilityAnalysisGuid = pair?.facilityAnalysisItems?.length === 1
      && pair.facilityAnalysisItems[0].facilityId === facilityGuid
        ? pair.facilityAnalysisItems[0].analysisItemId
        : undefined;
    if (!facilityAnalysisGuid) {
      return ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'dashboard'];
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

function accountRouteParts(state: RouterStateSnapshot): Array<string> {
  const path = state.url.split(/[?#]/, 1)[0];
  const parts = path.split('/').filter(Boolean);
  const workspaceIndex = parts.indexOf('workspace');
  return workspaceIndex >= 0 ? parts.slice(workspaceIndex) : [];
}

function isCustomDataDetail(detail: string | undefined): detail is string {
  return detail === 'custom-grid-factors' || detail === 'custom-fuels' || detail === 'custom-gwps';
}
