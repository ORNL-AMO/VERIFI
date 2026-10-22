import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { reportAccount, reportFacility, reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { AccountReportActionsService } from './account-report-actions.service';

describe('AccountReportActionsService', () => {
  let store: AccountWorkspaceStore;
  let service: AccountReportActionsService;
  let handler: { addAccountReport: ReturnType<typeof vi.fn>; updateAccountReport: ReturnType<typeof vi.fn>; deleteAccountReport: ReturnType<typeof vi.fn> };
  let boundary: { execute: ReturnType<typeof vi.fn> };
  const fixture = () => ({ ...getNewIdbAccountReport(reportAccount, [reportFacility], []), guid: 'account-report', id: 3, name: 'Saved account report', reportType: 'analysis' as const });
  beforeEach(() => {
    store = new AccountWorkspaceStore(); store.publish({ ...reportSnapshot(), accountReports: [fixture()] });
    handler = { addAccountReport: vi.fn(async report => ({ ...report, id: 20 })), updateAccountReport: vi.fn(async report => report), deleteAccountReport: vi.fn(async report => report.id) };
    boundary = { execute: vi.fn(async (options, persist) => { const value = await persist(); store.publishCommittedPatch(options.publication.buildPatch(value)); return { value }; }) };
    TestBed.configureTestingModule({ providers: [AccountReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: ReportCommandHandler, useValue: handler }, { provide: WorkspaceCommandBoundary, useValue: boundary }] });
    service = TestBed.inject(AccountReportActionsService);
  });
  it.each(ACCOUNT_REPORT_TYPES)('creates $label through existing defaults with one committed publication', async ({ value }) => {
    const created = await service.create(' New report ', value);
    expect(created.name).toBe('New report'); expect(created.reportType).toBe(value);
    expect(created.analysisReportSetup.analysisItemId).toBeUndefined();
    expect(created.dataOverviewReportSetup.includedFacilities).toEqual([{ facilityId: 'facility-a', included: true, includedGroups: [] }]);
    expect(store.revision()).toBe(1); expect(store.selectedFacility()).toBeUndefined();
  });
  it('copies all nested settings and GUID references with a new report identity', async () => {
    const source = fixture(); source.analysisReportSetup.analysisItemId = 'hidden-single-site-pair';
    source.reportYear = 2024; source.checked = true; store.publish({ ...reportSnapshot(), accountReports: [source] });
    const copy = await service.copy(source.guid);
    expect(copy.guid).not.toBe(source.guid); expect(copy.id).not.toBe(source.id); expect(copy.checked).toBe(false);
    expect(copy.analysisReportSetup).toEqual(source.analysisReportSetup); expect(copy.analysisReportSetup).not.toBe(source.analysisReportSetup);
    expect(copy.dataOverviewReportSetup).toEqual(source.dataOverviewReportSetup); expect(copy.reportYear).toBe(2024);
  });
  it('merges a rename into the latest saved record and skips unchanged names', async () => {
    expect(await service.updateName('account-report', ' Saved account report ')).toBe(store.accountReports()[0]); expect(boundary.execute).not.toHaveBeenCalled();
    boundary.execute.mockImplementationOnce(async (options, persist) => {
      const latest = { ...store.accountReports()[0], reportYear: 2025 };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [latest] }] });
      const value = await persist(); store.publishCommittedPatch(options.publication.buildPatch(value)); return { value };
    });
    const renamed = await service.updateName('account-report', ' Revised ');
    expect(renamed.name).toBe('Revised'); expect(renamed.reportYear).toBe(2025);
    expect(renamed.analysisReportSetup).toEqual(fixture().analysisReportSetup);
  });
  it('rejects invalid input, unavailable impacts, wrong owners and stale queued account changes', async () => {
    await expect(service.create(' ', 'analysis')).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(service.copy('missing')).rejects.toMatchObject({ code: 'validation-failed' });
    store.publish({ ...reportSnapshot(), account: { ...reportAccount, displayEmissions: false }, accountReports: [fixture()] });
    await expect(service.create('Emissions', 'betterClimate')).rejects.toThrow('Other Impacts');
    await expect(service.create('Factors', 'accountEmissionFactors')).rejects.toThrow('Other Impacts');
    store.publish({ ...reportSnapshot(), accountReports: [{ ...fixture(), accountId: 'other-account' }] });
    await expect(service.delete('account-report')).rejects.toMatchObject({ code: 'validation-failed' });
    boundary.execute.mockImplementationOnce(async (_options, persist) => {
      store.publish({ ...reportSnapshot(), account: { ...reportAccount, guid: 'account-b' } }); return { value: await persist() };
    });
    await expect(service.create('Stale', 'analysis')).rejects.toMatchObject({ code: 'workspace-not-ready' }); expect(handler.addAccountReport).not.toHaveBeenCalled();
  });
  it('preserves records after failed writes and deletes only the selected report', async () => {
    handler.addAccountReport.mockRejectedValueOnce(new Error('Disk full'));
    const revision = store.revision(); await expect(service.copy('account-report')).rejects.toThrow('Disk full'); expect(store.revision()).toBe(revision);
    await service.delete('account-report'); expect(store.accountReports()).toEqual([]); expect(store.facilityReports()).toHaveLength(1);
  });
});
