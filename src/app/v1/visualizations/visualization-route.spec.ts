import { describe, expect, it } from 'vitest';
import { isAccountInventory, parseWorkspaceRoute, visualizationDashboardRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';

describe('visualization route identity', () => {
  it('uses Dashboard as the default visualization destination', () => {
    const route = parseWorkspaceRoute('/v1/workspace/account/account-a/visualization');
    expect(route.detail).toBe('dashboard');
    expect(isAccountInventory(route)).toBe(true);
  });

  it('keeps Dashboard scope in browsing and saved identity in workbench paths', () => {
    expect(visualizationDashboardRoute('account-a')).toEqual(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'dashboard']);
    const route = parseWorkspaceRoute(visualizationWorkbenchRoute('account-a', 'chart-a').join('/') + '?facility=other');
    expect(route.visualizationGuid).toBe('chart-a');
    expect(route.accountGuid).toBe('account-a');
    expect(route.facilityGuid).toBeUndefined();
    expect(isAccountInventory(route)).toBe(false);
    expect(isAccountInventory(parseWorkspaceRoute('/v1/workspace/account/account-a/visualization/dashboard'))).toBe(true);
  });
});
