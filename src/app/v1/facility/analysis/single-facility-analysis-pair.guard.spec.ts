import { TestBed } from '@angular/core/testing';
import { Component, inject, signal } from '@angular/core';
import { RouterTestingHarness } from '@angular/router/testing';
import { ActivatedRouteSnapshot, Navigation, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { SingleFacilityAnalysisPairService } from './single-facility-analysis-pair.service';
import { singleFacilityAnalysisPairGuard } from './single-facility-analysis-pair.guard';
import { ReportAnalysisReturnService } from '@app/v1/shared/reports/report-analysis-return.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisWorkbenchNavigationService } from './facility-analysis-workbench/navigation/facility-analysis-workbench-navigation.service';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench/facility-analysis-workbench-context.service';
import { FacilityAnalysisAutosaveService } from './facility-analysis-workbench/editing/facility-analysis-autosave.service';
import { FacilityAnalysisPeriodService } from './facility-analysis-workbench/analysis-setup/facility-analysis-period.service';
import { FacilityAnalysisWorkbenchStageNavigationComponent } from './facility-analysis-workbench/stage-navigation/facility-analysis-workbench-stage-navigation.component';
import { buildAnalysisWorkbenchStages } from './facility-analysis-workbench/facility-analysis-workbench.models';
import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';

@Component({ standalone: true, imports: [FacilityAnalysisWorkbenchStageNavigationComponent],
  providers: [ReportAnalysisReturnService, FacilityAnalysisWorkbenchNavigationService],
  template: '<app-facility-analysis-workbench-stage-navigation />' })
class ReportInspectionWorkbench {
  readonly navigation = inject(FacilityAnalysisWorkbenchNavigationService);
  readonly reportReturn = inject(ReportAnalysisReturnService);
}

describe('single-facility Analysis entry from report status', () => {
  function setup(state?: Record<string, unknown>) {
    const snapshot = accountReportSnapshot(true); snapshot.accountAnalyses[0].name = 'Stale saved pair';
    const store = new AccountWorkspaceStore(); store.publish(snapshot);
    const ensurePairs = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AccountWorkspaceStore, useValue: store },
      { provide: SingleFacilityAnalysisPairService, useValue: { ensurePairs } }] });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'currentNavigation').mockReturnValue({ extras: { state } } as Navigation);
    const open = (url = '/v1/workspace/facility/facility-a/analysis/workbench/facility-analysis/setup') => TestBed.runInInjectionContext(() =>
      singleFacilityAnalysisPairGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));
    return { store, snapshot, ensurePairs, open };
  }
  const origin = { reportStatusSource: { kind: 'account-report', guid: 'account-report', accountGuid: 'account-a', name: 'Saved report' } };
  it('uses only a matching owned saved reference and skips reconciliation for a status drill-in', async () => {
    const { store, snapshot, ensurePairs, open } = setup(origin);
    expect(await open()).toBe(true); expect(ensurePairs).not.toHaveBeenCalled();
    expect(store.snapshot()).toEqual(snapshot); expect(store.committedRevision()).toBeUndefined();
  });
  it('keeps normal Analysis entry reconciliation', async () => {
    const { ensurePairs, open } = setup(); expect(await open()).toBe(true); expect(ensurePairs).toHaveBeenCalledOnce();
  });
  it('preserves a report origin across stages, tabs, footer navigation and reload with a stale saved pair', async () => {
    const snapshot = accountReportSnapshot(true);
    snapshot.accountAnalyses[0].name = 'Stale saved pair';
    const group = getNewAnalysisGroup('group-a', []); group.analysisType = 'absoluteEnergyConsumption';
    snapshot.facilityAnalyses[0].groups = [group];
    const store = new AccountWorkspaceStore(); store.publish(snapshot);
    const original = store.snapshot();
    const ensurePairs = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'v1/workspace/facility/:facilityGuid/analysis', canActivateChild: [singleFacilityAnalysisPairGuard],
        children: [{ path: 'workbench/:analysisGuid', children: [{ path: '**', component: ReportInspectionWorkbench }] }] },
      { path: 'report-setup', component: ReportInspectionWorkbench }
    ]), { provide: AccountWorkspaceStore, useValue: store },
      { provide: SingleFacilityAnalysisPairService, useValue: { ensurePairs } },
      { provide: FacilityAnalysisWorkbenchContext, useValue: {
        stages: signal(buildAnalysisWorkbenchStages('facility-a', snapshot.facilityAnalyses[0], [])),
        analysisGuid: signal('facility-analysis'), findings: signal([]), analysis: signal(snapshot.facilityAnalyses[0]),
        facility: signal(snapshot.facilities[0]), analyses: signal(snapshot.facilityAnalyses),
        status: { state: signal('ready'), items: signal([]) }
      } },
      { provide: FacilityAnalysisAutosaveService, useValue: { state: signal('saved'), draft: signal(undefined) } },
      { provide: FacilityAnalysisPeriodService, useValue: { bankingLatestCompleteYears: () => ({}) } },
      { provide: WorkspaceNavigationService, useValue: { accountReportWorkbenchRoute: () => ['/report-setup'] } }
    ] });
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create();
    const query = '?returnReportAccountGuid=account-a&returnReportGuid=account-report';
    const base = '/v1/workspace/facility/facility-a/analysis/workbench/facility-analysis';
    let workbench = await harness.navigateByUrl(base + '/setup' + query, ReportInspectionWorkbench);
    harness.detectChanges();
    const groupLink = Array.from<HTMLAnchorElement>(harness.routeNativeElement!.querySelectorAll('a'))
      .find(link => link.href.includes('/group/group-a/'))!;
    expect(groupLink.search).toBe(query);
    await harness.navigateByUrl(groupLink.getAttribute('href')!, ReportInspectionWorkbench);
    workbench.navigation.openContextTab('annual'); await harness.fixture.whenStable();
    expect(router.url).toBe(base + '/group/group-a/annual' + query);
    workbench.navigation.continue(); await harness.fixture.whenStable();
    expect(router.url).toBe(base + '/facility/annual' + query);
    workbench.navigation.openContextTab('monthly-table'); await harness.fixture.whenStable();
    expect(router.url).toBe(base + '/facility/monthly-table' + query);
    workbench.navigation.back(); await harness.fixture.whenStable();
    expect(router.url).toBe(base + '/group/group-a/setup' + query);
    // Recreate the workbench as a reload/new entry would, using only the persisted URL origin.
    await router.navigateByUrl('/report-setup');
    workbench = await harness.navigateByUrl(base + '/facility/annual' + query, ReportInspectionWorkbench);
    expect(workbench.reportReturn.origin()).toEqual({ accountGuid: 'account-a', reportGuid: 'account-report' });
    expect(await workbench.reportReturn.returnToReport()).toBe(true);
    expect(router.url).toBe('/report-setup');
    expect(ensurePairs).not.toHaveBeenCalled();
    expect(store.snapshot()).toBe(original); expect(store.committedRevision()).toBeUndefined();
  });
  it('opens an inspected, unselected analysis with a report return without repairing saved pairs', async () => {
    const { store, snapshot, ensurePairs, open } = setup();
    const other = { ...snapshot.facilityAnalyses[0], id: 21, guid: 'other-analysis' };
    store.publish({ ...snapshot, facilityAnalyses: [...snapshot.facilityAnalyses, other] });
    const original = store.snapshot();
    const query = '?returnReportAccountGuid=account-a&returnReportGuid=account-report';
    expect(await open('/v1/workspace/facility/facility-a/analysis/workbench/other-analysis/setup' + query)).toBe(true);
    expect(ensurePairs).not.toHaveBeenCalled(); expect(store.snapshot()).toBe(original);
    expect(await open('/v1/workspace/facility/facility-a/analysis/workbench/missing/setup' + query)).toBe(false);
    store.publish({ ...snapshot, accountReports: [] });
    expect(await open('/v1/workspace/facility/facility-a/analysis/workbench/facility-analysis/setup' + query)).toBe(false);
    expect(ensurePairs).not.toHaveBeenCalled();
  });
  it('blocks stale history origins or a different destination without repairing records', async () => {
    const { store, ensurePairs, open } = setup(origin);
    expect(await open('/v1/workspace/facility/facility-a/analysis/workbench/other/setup')).toBe(false);
    store.publish({ ...accountReportSnapshot(true), accountReports: [] });
    expect(await open()).toBe(false); expect(ensurePairs).not.toHaveBeenCalled();
  });
});
