import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { accountReportSnapshot } from '@app/v1/reports/account/testing/account-report-test-fixtures';
import { readReportAnalysisOrigin, resolveReportAnalysisOrigin } from './report-analysis-origin';
import { ReportAnalysisReturnService } from './report-analysis-return.service';

describe('report return from analysis', () => {
  function setup(params: Record<string, string> = { returnReportAccountGuid: 'account-a', returnReportGuid: 'account-report' }) {
    const store = new AccountWorkspaceStore(); store.publish(accountReportSnapshot());
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [ReportAnalysisReturnService,
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      { provide: AccountWorkspaceStore, useValue: store }, { provide: Router, useValue: { navigate } },
      { provide: WorkspaceNavigationService, useValue: { accountReportWorkbenchRoute: (account: string, report: string) => ['/v1', 'workspace', 'account', account, 'reports', 'workbench', report, 'setup'], facilityReportWorkbenchRoute: (facility: string, report: string) => ['/v1', 'workspace', 'facility', facility, 'reports', 'workbench', report, 'setup'] } }
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

  it('resolves facility origins explicitly without confusing account reports sharing the GUID', () => {
    const snapshot = accountReportSnapshot(), report = snapshot.facilityReports[0];
    const origin = readReportAnalysisOrigin(convertToParamMap({ returnReportAccountGuid: 'account-a', returnReportGuid: report.guid,
      returnReportScope: 'facility', returnReportFacilityGuid: report.facilityId }));
    expect(origin).toEqual({ accountGuid: 'account-a', reportGuid: report.guid, scope: 'facility', facilityGuid: report.facilityId });
    expect(resolveReportAnalysisOrigin(origin, snapshot)).toEqual(origin);
    expect(resolveReportAnalysisOrigin(origin, { ...snapshot, facilityReports: [] })).toBeUndefined();
    expect(readReportAnalysisOrigin(convertToParamMap({ returnReportAccountGuid: 'account-a', returnReportGuid: report.guid, returnReportScope: 'facility' }))).toBeUndefined();
  });

  it('returns a facility report origin to the correct owning Setup and preserves its scope', async () => {
    const { service, navigate } = setup({ returnReportAccountGuid: 'account-a', returnReportGuid: 'report-a', returnReportScope: 'facility', returnReportFacilityGuid: 'facility-a' });
    expect(service.queryParams()).toMatchObject({ returnReportScope: 'facility', returnReportFacilityGuid: 'facility-a' });
    expect(await service.returnToReport()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-a', 'reports', 'workbench', 'report-a', 'setup']);
  });

  it.each([
    ['analysis', true], ['overview', false], ['emissionFactors', false], ['savings', false],
    ['modeling', false], ['costSavings', false], ['dataQuality', false]
  ] as const)('resolves facility %s returns only when that workflow supports analysis inspection', (type, supported) => {
    const snapshot = accountReportSnapshot();
    const report = { ...snapshot.facilityReports[0], facilityReportType: type };
    const origin = { accountGuid: snapshot.account.guid, reportGuid: report.guid, scope: 'facility' as const, facilityGuid: report.facilityId };
    expect(resolveReportAnalysisOrigin(origin, { ...snapshot, facilityReports: [report] })).toEqual(supported ? origin : undefined);
  });

  it.each([
    ['betterPlants', true], ['dataOverview', false], ['performance', true], ['betterClimate', false],
    ['analysis', true], ['accountEmissionFactors', false], ['accountSavings', true]
  ] as const)('preserves account %s analysis-return support independently of content migration', (type, supported) => {
    const snapshot = accountReportSnapshot();
    const report = { ...snapshot.accountReports[0], reportType: type };
    const origin = { accountGuid: snapshot.account.guid, reportGuid: report.guid };
    expect(resolveReportAnalysisOrigin(origin, { ...snapshot, accountReports: [report] })).toEqual(supported ? origin : undefined);
  });

  it('suppresses origins from another account', async () => {
    const { service, navigate } = setup({ returnReportAccountGuid: 'other-account', returnReportGuid: 'account-report' });
    expect(service.origin()).toBeUndefined();
    expect(await service.returnToReport()).toBe(false); expect(navigate).not.toHaveBeenCalled();
  });
});
