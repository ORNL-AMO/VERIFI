import { HomeOwner, presentedHomeOwner } from '@domain/home/home-dashboard';
import { RouteState } from '@app/v1/routing/workspace-route';

/** Destination/accepted URL ownership, independent of remembered workspace selection. */
export function homeRouteOwner(account: { readonly guid: string; readonly isSingleFacilityCompany?: boolean },
  facilities: readonly { readonly guid: string; readonly accountId: string }[], route: RouteState): HomeOwner | undefined {
  if (route.section !== 'home') return undefined;
  const presented = presentedHomeOwner(account, facilities);
  if (!presented) return undefined;
  if (route.contextMode === 'account') return route.accountGuid === account.guid
    && !((route.homeDashboardGuid || route.detail === 'built-in') && presented.kind !== 'account') ? presented : undefined;
  return facilities.some(item => item.guid === route.facilityGuid && item.accountId === account.guid)
    ? { kind: 'facility', guid: route.facilityGuid! } : undefined;
}
