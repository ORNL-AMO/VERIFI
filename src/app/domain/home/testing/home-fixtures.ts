import { HomeDashboardDefinition, HomeOwner, HomeOwnerState, HomeWidget } from '../home-dashboard';

export const homeAccountOwner: HomeOwner = { kind: 'account', guid: 'account-a' };
export function homeDefinition(widgets: readonly HomeWidget[] = []): HomeDashboardDefinition {
  return { version: 1, name: 'Home', widgets, defaults: {}, visibility: 'always' };
}
export function homeOwnerState(order: readonly string[] = []): HomeOwnerState {
  return { version: 1, initialized: true, dashboardOrder: order, deletedStarters: [], ...(order.length ? { defaultDashboardGuid: order[0] } : {}) };
}
export function chartWidget(guid = 'chart-a', id = 'widget-a'): HomeWidget {
  return { kind: 'visualization', id, size: 'half', visualizationGuid: guid, visibility: 'always', inherit: [], overrides: {} };
}
