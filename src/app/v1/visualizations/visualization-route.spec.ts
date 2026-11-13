import { describe, expect, it } from 'vitest';
import { isAccountInventory, parseWorkspaceRoute, visualizationLibraryRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';

describe('visualization route identity', () => {
  it('keeps library scope in browsing and saved identity in workbench paths', () => {
    expect(visualizationLibraryRoute('account-a')).toEqual(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'library']);
    const route = parseWorkspaceRoute(visualizationWorkbenchRoute('account-a', 'chart-a').join('/') + '?facility=other');
    expect(route.visualizationGuid).toBe('chart-a');
    expect(route.accountGuid).toBe('account-a');
    expect(route.facilityGuid).toBeUndefined();
    expect(isAccountInventory(route)).toBe(false);
    expect(isAccountInventory(parseWorkspaceRoute('/v1/workspace/account/account-a/visualization/library'))).toBe(true);
  });
});
