import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { weatherStationRouteKey } from './models';

export const predictorCanonicalRouteGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const workspace = inject(AccountWorkspaceStore);
  const router = inject(Router);
  const navigation = inject(WorkspaceNavigationService);
  const predictorGuid = route.paramMap.get('predictorGuid');
  const predictor = predictorGuid
    ? workspace.facilityPredictors().find(candidate => candidate.guid === predictorGuid)
    : undefined;
  const facility = workspace.selectedFacility();
  if (!predictor || predictor.predictorType !== 'Weather' || !facility) return true;

  const requestedTab = state.url.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1);
  const groupKey = weatherStationRouteKey(predictor);
  const destination = requestedTab === 'quality'
    ? navigation.facilityWeatherPredictorQualityRoute(facility.guid, groupKey, predictor.guid)
    : navigation.facilityWeatherPredictorRoute(
      facility.guid,
      groupKey,
      requestedTab === 'readings' ? 'readings' : 'setup'
    );
  return router.createUrlTree(destination);
};
