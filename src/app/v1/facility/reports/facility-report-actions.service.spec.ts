import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { FacilityReportActionsService } from './facility-report-actions.service';
import { FACILITY_REPORT_TYPES } from './facility-report.models';
import { reportFacility, reportFixture, reportSnapshot } from './testing/report-test-fixtures';

describe('FacilityReportActionsService', () => {
  let store: AccountWorkspaceStore;
  let service: FacilityReportActionsService;
  let handler: { addFacilityReport: ReturnType<typeof vi.fn>; deleteFacilityReport: ReturnType<typeof vi.fn> };
  let boundary: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    store = new AccountWorkspaceStore();
    store.publish(reportSnapshot(), { facility: reportFacility });
    handler = {
      addFacilityReport: vi.fn(async report => ({ ...report, id: 11 })),
      deleteFacilityReport: vi.fn(async report => report.id)
    };
    boundary = { execute: vi.fn(async (options, persist) => {
      const value = await persist();
      store.publishCommittedPatch(options.publication.buildPatch(value));
      return { value };
    }) };
    TestBed.configureTestingModule({ providers: [
      FacilityReportActionsService, { provide: AccountWorkspaceStore, useValue: store },
      { provide: ReportCommandHandler, useValue: handler }, { provide: WorkspaceCommandBoundary, useValue: boundary }
    ] });
    service = TestBed.inject(FacilityReportActionsService);
  });

  it.each(FACILITY_REPORT_TYPES)('creates $label through existing defaults and one publication', async ({ value }) => {
    const created = await service.create('facility-a', '  Annual report  ', value);
    expect(created.name).toBe('Annual report');
    expect(created.facilityReportType).toBe(value);
    expect(created.analysisItemId).toBeUndefined();
    expect(created.modelingReportSettings.includeExecutiveSummary).toBe(true);
    expect(store.revision()).toBe(1);
    expect(store.facilityReports()).toContainEqual(created);
  });

  it('copies every setting and GUID reference without sharing nested settings', async () => {
    const source = reportFixture({ analysisItemId: 'analysis-a', checked: true });
    source.analysisReportSettings.reportYear = 2023;
    source.costSavingsReportSettings.unitCostTable = { 2023: { 'group-a': 4.2 } };
    store.publish(reportSnapshot([source]), { facility: reportFacility });
    const copy = await service.copy('facility-a', source.guid);
    expect(copy.id).toBe(11);
    expect(copy.guid).not.toBe(source.guid);
    expect(copy.analysisItemId).toBe('analysis-a');
    expect(copy.costSavingsReportSettings).toEqual(source.costSavingsReportSettings);
    expect(copy.analysisReportSettings).toEqual(source.analysisReportSettings);
    expect(copy.analysisReportSettings).not.toBe(source.analysisReportSettings);
    expect(copy.checked).toBe(false);
    expect(copy.createdDate.getTime()).toBeGreaterThan(source.createdDate.getTime());
  });

  it('rejects creation and copying of Emission Factors when Other Impacts is unchecked', async () => {
    const snapshot = reportSnapshot([reportFixture({ facilityReportType: 'emissionFactors' })]);
    store.publish({ ...snapshot, account: { ...snapshot.account, displayEmissions: false } }, { facility: reportFacility });
    await expect(service.create('facility-a', 'Factors', 'emissionFactors')).rejects.toThrow('Other Impacts');
    await expect(service.copy('facility-a', 'report-a')).rejects.toThrow('Other Impacts');
    expect(handler.addFacilityReport).not.toHaveBeenCalled();
    expect(store.facilityReports()).toHaveLength(1);
  });

  it('rejects missing and wrong-owner reports, blank names, and changed facility context', async () => {
    await expect(service.create('facility-a', '  ', 'analysis')).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(service.copy('facility-a', 'missing')).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(service.create('facility-b', 'New report', 'analysis')).rejects.toMatchObject({ code: 'workspace-not-ready' });
    store.publish(reportSnapshot([reportFixture({ accountId: 'account-b' })]), { facility: reportFacility });
    await expect(service.delete('facility-a', 'report-a')).rejects.toMatchObject({ code: 'validation-failed' });
    expect(handler.deleteFacilityReport).not.toHaveBeenCalled();
  });

  it('does not publish failed writes and preserves unrelated records on deletion', async () => {
    handler.addFacilityReport.mockRejectedValueOnce(new Error('disk full'));
    const revision = store.revision();
    await expect(service.copy('facility-a', 'report-a')).rejects.toThrow('disk full');
    expect(store.revision()).toBe(revision);
    expect(store.facilityReports()[0].name).toBe('Saved report');
    await service.delete('facility-a', 'report-a');
    expect(store.facilityReports()).toEqual([]);
    expect(store.facilities()).toEqual([reportFacility]);
  });
});
