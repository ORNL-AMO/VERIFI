import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { accountReportSnapshot } from '@app/v1/account/reports/testing/account-report-test-fixtures';
import { readReportAnalysisOrigin } from './report-analysis-origin';
import { ReportAnalysisReturnService } from './report-analysis-return.service';

describe('report return from analysis', () => {
  function setup(params = { returnReportAccountGuid: 'account-a', returnReportGuid: 'account-report' }) {
    const store = new AccountWorkspaceStore(); store.publish(accountReportSnapshot());
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [ReportAnalysisReturnService,
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      { provide: AccountWorkspaceStore, useValue: store }, { provide: Router, useValue: { navigate } },
      { provide: WorkspaceNavigationService, useValue: { accountReportWorkbenchRoute: (account: string, report: string) => ['/v1', 'workspace', 'account', account, 'reports', 'workbench', report, 'setup'] } }
    ] });
    return { service: TestBed.inject(ReportAnalysisReturnService), store, navigate };
  }

  it('requires complete GUID identities and ignores arbitrary return URLs', () => {
    expect(readReportAnalysisOrigin(convertToParamMap({ returnReportGuid: 'account-report', returnUrl: 'https://example.com' }))).toBeUndefined();
    expect(readReportAnalysisOrigin(convertToParamMap({ returnReportAccountGuid: ' account-a ', returnReportGuid: ' account-report ' })))
      .toEqual({ accountGuid: 'account-a', reportGuid: 'account-report' });
  });

  it('returns to canonical report Setup and retains a transferable origin without writing records', async () => {
    const { service, store, navigate } = setup();
    const original = store.snapshot();
    expect(service.queryParams()).toEqual({ returnReportAccountGuid: 'account-a', returnReportGuid: 'account-report' });
    expect(await service.returnToReport()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'reports', 'workbench', 'account-report', 'setup']);
    expect(store.snapshot()).toBe(original); expect(store.committedRevision()).toBeUndefined();
    store.publish({ ...original!, accountReports: [] });
    expect(service.origin()).toBeUndefined();
    expect(await service.returnToReport()).toBe(false);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('suppresses origins from another account', async () => {
    const { service, navigate } = setup({ returnReportAccountGuid: 'other-account', returnReportGuid: 'account-report' });
    expect(service.origin()).toBeUndefined();
    expect(await service.returnToReport()).toBe(false); expect(navigate).not.toHaveBeenCalled();
  });
});
