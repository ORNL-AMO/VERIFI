import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Navigation, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { SingleFacilityAnalysisPairService } from './single-facility-analysis-pair.service';
import { singleFacilityAnalysisPairGuard } from './single-facility-analysis-pair.guard';

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
  it('blocks stale history origins or a different destination without repairing records', async () => {
    const { store, ensurePairs, open } = setup(origin);
    expect(await open('/v1/workspace/facility/facility-a/analysis/workbench/other/setup')).toBe(false);
    store.publish({ ...accountReportSnapshot(true), accountReports: [] });
    expect(await open()).toBe(false); expect(ensurePairs).not.toHaveBeenCalled();
  });
});
