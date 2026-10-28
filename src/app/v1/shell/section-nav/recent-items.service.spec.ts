import { TestBed } from '@angular/core/testing';
import { NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { reportFixture, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { RecentItemsService } from './recent-items.service';

function setup(url = '/v1/workspace/account/account-a/analysis/dashboard', ready = true) {
  const store = new AccountWorkspaceStore(), base = reportSnapshot();
  const snapshot = { ...base, facilityAnalyses: Array.from({ length: 7 }, (_, index) => ({
    guid: `a${index}`, name: `Analysis ${index}`, accountId: base.account.guid, facilityId: base.facilities[0].guid, analysisCategory: 'energy', groups: []
  } as IdbAnalysisItem)) };
  if (ready) store.publish(snapshot);
  const events = new Subject<unknown>();
  TestBed.configureTestingModule({ providers: [
    { provide: Router, useValue: { url, events } }, { provide: AccountWorkspaceStore, useValue: store },
    { provide: WorkspaceNavigationService, useValue: {
      facilityAnalysisWorkbenchRoute: (facility: string, guid: string) => ['/v1', 'workspace', 'facility', facility, 'analysis', 'workbench', guid, 'setup'],
      facilityReportWorkbenchRoute: (facility: string, guid: string) => ['/v1', 'workspace', 'facility', facility, 'reports', 'workbench', guid, 'setup']
    } }
  ] });
  const service = TestBed.inject(RecentItemsService);
  const visit = (guid: string, section = 'analysis', facility = 'facility-a', stage = 'analysis') => {
    const target = `/v1/workspace/facility/${facility}/${section}/workbench/${guid}/${stage}`;
    events.next(new NavigationEnd(1, target, target));
  };
  const dashboard = () => events.next(new NavigationEnd(1, '', '/v1/workspace/account/account-a/analysis/dashboard'));
  TestBed.tick();
  return { service, store, snapshot, events, visit, dashboard };
}

describe('recent facility workspace items', () => {
  it('keeps five unique most-recent items per section and leaves the workspace unchanged', () => {
    const { service, store, snapshot, visit } = setup();
    const before = structuredClone(store.snapshot());
    for (let index = 0; index < 7; index++) visit(`a${index}`);
    visit('a3'); visit('a3', 'analysis', 'facility-a', 'facility');
    expect(service.analyses().map(item => item.guid)).toEqual(['a3', 'a6', 'a5', 'a4', 'a2']);
    visit(snapshot.facilityReports[0].guid, 'reports', 'facility-a', 'setup');
    expect(service.reports().map(item => item.guid)).toEqual(['report-a']);
    expect(service.analyses()).toHaveLength(5); expect(store.snapshot()).toEqual(before);
  });
  it('records initial direct entry once the committed workspace is ready', () => {
    const { service, store, snapshot } = setup('/v1/workspace/facility/facility-a/analysis/workbench/a2/analysis', false);
    expect(service.analyses()).toEqual([]);
    store.publish(snapshot); TestBed.tick();
    expect(service.analyses().map(item => item.guid)).toEqual(['a2']);
    expect(service.analyses()[0]).toMatchObject({ name: 'Analysis 2', facilityName: 'Facility A', label: 'Analysis 2, Facility A' });
  });
  it('does not record cancelled/failed navigation, dashboards, foreign ownership or account workbenches', () => {
    const { service, events, visit, dashboard, store, snapshot } = setup();
    events.next(new NavigationStart(1, '/v1/workspace/facility/facility-a/analysis/workbench/a1/analysis'));
    events.next(new NavigationCancel(1, '', 'Cancelled')); TestBed.tick();
    dashboard(); visit('a1', 'analysis', 'foreign-facility'); visit('missing');
    events.next(new NavigationEnd(1, '', '/v1/workspace/account/account-a/analysis/workbench/a1/setup'));
    store.publish({ ...snapshot, facilityAnalyses: snapshot.facilityAnalyses.map(item => ({ ...item, accountId: 'foreign' })) });
    visit('a1'); expect(service.analyses()).toEqual([]);
  });
  it('resolves fresh names and removes deleted items, facilities and unavailable report types', () => {
    const { service, store, snapshot, visit, dashboard } = setup();
    visit('a1'); visit('a2');
    const report = reportFixture({ facilityReportType: 'emissionFactors' });
    store.publish({ ...snapshot, facilityReports: [report] }); visit(report.guid, 'reports', 'facility-a', 'setup'); dashboard();
    store.publish({ ...snapshot, account: { ...snapshot.account, displayEmissions: false }, facilityReports: [report],
      facilities: snapshot.facilities.map(item => ({ ...item, name: 'Renamed plant' })),
      facilityAnalyses: snapshot.facilityAnalyses.filter(item => item.guid !== 'a1').map(item => ({ ...item, name: 'Renamed analysis' })) });
    expect(service.analyses().map(item => item.guid)).toEqual(['a2']);
    expect(service.analyses()[0].label).toBe('Renamed analysis, Renamed plant'); expect(service.reports()).toEqual([]);
    store.publish({ ...snapshot, facilities: [] }); expect(service.analyses()).toEqual([]); expect(service.reports()).toEqual([]);
  });
  it('keeps history separate when switching accounts and restores the original account’s session history', () => {
    const { service, store, snapshot, visit, dashboard } = setup();
    visit('a1'); dashboard();
    const other = { ...snapshot, account: { ...snapshot.account, guid: 'account-b' },
      facilities: [{ ...snapshot.facilities[0], guid: 'facility-b', accountId: 'account-b' }],
      facilityAnalyses: [{ ...snapshot.facilityAnalyses[0], guid: 'b0', facilityId: 'facility-b', accountId: 'account-b' }] };
    store.publish(other); TestBed.tick(); expect(service.analyses()).toEqual([]);
    visit('b0', 'analysis', 'facility-b'); expect(service.analyses().map(item => item.guid)).toEqual(['b0']);
    dashboard(); store.publish(snapshot); TestBed.tick(); expect(service.analyses().map(item => item.guid)).toEqual(['a1']);
  });
});
