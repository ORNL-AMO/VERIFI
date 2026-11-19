import { chartWidget, homeDefinition } from '@domain/home/testing/home-fixtures';
import { duplicateHomeReferenceIssues, homeChartDependencies } from './home-references';
import { getNewIdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { HomeReferenceIssue } from '@data/models/idbModels/homeRecord';
import { homeAccountOwner } from '@domain/home/testing/home-fixtures';

describe('Home widget dependencies and duplication', () => {
  it('preserves blocked intent against the exact widget identity even when imported IDs share prefixes', () => {
    const definition = homeDefinition([chartWidget('chart-a', 'one'), chartWidget('chart-a', 'one.child')]);
    const issues: HomeReferenceIssue[] = [{ path: 'widgets.one.child.visualizationGuid', kind: 'visualization', guid: 'chart-a', reason: 'not-transferred' }];
    expect(duplicateHomeReferenceIssues(definition, issues, { one: 'first-copy', 'one.child': 'second-copy' }))
      .toEqual([{ ...issues[0], path: 'widgets.second-copy.visualizationGuid' }]);
    expect(issues[0].path).toBe('widgets.one.child.visualizationGuid');
  });
  it('exposes all affected widgets and unreadable uncertainty without mutating missing links', () => {
    const record = getNewIdbHomeDashboard('account-a', homeAccountOwner, homeDefinition([chartWidget('missing')]));
    const unknown = { ...record, guid: 'unknown-dashboard', definition: { version: 900, future: true } };
    const result = homeChartDependencies([record, unknown], 'missing');
    expect(result.widgets).toEqual([{ dashboardGuid: record.guid, dashboardName: 'Home', owner: homeAccountOwner, widgetId: 'widget-a' }]);
    expect(result.unreadableDashboardGuids).toEqual(['unknown-dashboard']);
    expect(record.definition).toEqual(homeDefinition([chartWidget('missing')]));
  });
});
