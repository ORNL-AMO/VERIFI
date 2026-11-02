import type { RouteState } from '@app/v1/routing/workspace-route';

/** Upload returns only to surviving inventories, workbenches, and Data tools. */
export function isWorkspaceDataDestination(route: RouteState): boolean {
  if (route.section === 'data') {
    if (route.contextMode === 'account') return route.detail === 'portfolio';
    return route.detail === 'meter-grouping' || route.detail === 'energy-uses'
      || route.detail === 'meters' && !!route.meterGuid
      || route.detail === 'predictors' && (!!route.predictorGuid || !!route.weatherPredictorGroupKey);
  }
  return (route.section === 'analysis' || route.section === 'reports')
    && (route.detail === 'workbench' || route.contextMode === 'account' && route.detail === 'dashboard');
}
