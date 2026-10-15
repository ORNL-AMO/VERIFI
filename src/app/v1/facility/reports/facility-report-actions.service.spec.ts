import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from '@data/account-workspace/handlers/report-command-handler.service';
import { FacilityReportActionsService } from './facility-report-actions.service';
import { FACILITY_REPORT_TYPES, buildFacilityReportCard, filterFacilityReportCards } from './facility-report.models';
import { evaluateWorkspaceStatus } from '@app/v1/status/status.evaluator';
import { presentFindings } from '@app/v1/status/status.catalog';
import { reportFacility, reportFixture, reportSnapshot } from './testing/report-test-fixtures';

describe('FacilityReportActionsService', () => {
  let store: AccountWorkspaceStore;
  let service: FacilityReportActionsService;
  let handler: { addFacilityReport: ReturnType<typeof vi.fn>; updateFacilityReport: ReturnType<typeof vi.fn>; deleteFacilityReport: ReturnType<typeof vi.fn> };
  let boundary: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    store = new AccountWorkspaceStore();
    store.publish(reportSnapshot(), { facility: reportFacility });
    handler = {
      addFacilityReport: vi.fn(async report => ({ ...report, id: 11 })),
      updateFacilityReport: vi.fn(async report => report),
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

  it('updates only the name from the latest owned record and skips unchanged names', async () => {
    const source = store.facilityReports()[0];
    expect(await service.updateName('facility-a', source.guid, ` ${source.name} `)).toBe(source);
    expect(boundary.execute).not.toHaveBeenCalled();
    const latest = structuredClone(source);
    latest.costSavingsReportSettings.unitCostTable = { 2024: { 'group-a': 6.2 } };
    boundary.execute.mockImplementationOnce(async (options, persist) => {
      store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [latest] }] });
      const value = await persist();
      store.publishCommittedPatch(options.publication.buildPatch(value));
      return { value };
    });
    const updated = await service.updateName('facility-a', source.guid, ' Revised name ');
    expect(updated).toEqual({ ...latest, name: 'Revised name' });
    expect(source.name).toBe('Saved report');
    expect(handler.updateFacilityReport).toHaveBeenCalledTimes(1);
    await expect(service.updateName('facility-a', source.guid, ' ')).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(service.updateName('facility-b', source.guid, 'Wrong facility')).rejects.toMatchObject({ code: 'workspace-not-ready' });
  });

  it('does not rewrite a name that another queued operation has already saved', async () => {
    boundary.execute.mockImplementationOnce(async (options, persist) => {
      const latest = reportFixture({ name: 'Already saved' });
      store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [latest] }] });
      const value = await persist();
      store.publishCommittedPatch(options.publication.buildPatch(value));
      return { value };
    });
    const saved = await service.updateName('facility-a', 'report-a', 'Already saved');
    expect(saved.name).toBe('Already saved');
    expect(saved.modifiedDate).toEqual(reportFixture().modifiedDate);
    expect(handler.updateFacilityReport).not.toHaveBeenCalled();
  });

  it('creates Data Quality reports with incomplete setup until a source selection is made', async () => {
    const created = await service.create('facility-a', 'Data quality', 'dataQuality');
    expect(created.dataQualityReportSettings.selectedMode).toBe('analysis');
    expect(created.dataQualityReportSettings.selectedAnalysisItemId).toBeUndefined();
    expect(created.dataQualityReportSettings.missingSelection).toBe(true);
    const evaluation = evaluateWorkspaceStatus({
      snapshot: reportSnapshot([created]), calendarizedMeters: [], asOfDate: new Date(2026, 0, 1), revision: 1
    });
    const card = buildFacilityReportCard(created, [], presentFindings(evaluation.findings), 'ready');
    expect(card.status).toBe('error');
    expect(card.view.chips?.map(chip => chip.label)).toContain('Setup incomplete');
    expect(filterFacilityReportCards([card], { search: '', type: 'all', status: 'ready', sort: 'attention' })).toEqual([]);
  });

  it('preserves saved Data Quality settings when copying an existing report', async () => {
    const source = reportFixture({ facilityReportType: 'dataQuality' });
    source.dataQualityReportSettings.selectedAnalysisItemId = 'analysis-a';
    store.publish(reportSnapshot([source]), { facility: reportFacility });
    const copy = await service.copy('facility-a', source.guid);
    expect(copy.dataQualityReportSettings).toEqual(source.dataQualityReportSettings);
    expect(copy.dataQualityReportSettings.missingSelection).toBe(false);
    expect(source.dataQualityReportSettings.missingSelection).toBe(false);
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
