import type { RouteState } from '@app/v1/shell/workspace-navigation.service';

/** Upload may return to data views and workbenches, never to another import or Settings. */
export function isWorkspaceDataDestination(route: Pick<RouteState, 'section' | 'detail'>): boolean {
  return route.section === 'data'
    ? ['portfolio', 'meters', 'predictors', 'meter-grouping', 'energy-uses'].includes(route.detail)
    : (route.section === 'analysis' || route.section === 'reports') && ['dashboard', 'workbench'].includes(route.detail);
}
