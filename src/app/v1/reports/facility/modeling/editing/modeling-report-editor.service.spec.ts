import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { mergeFacilityModelingSettings } from '@data/account-workspace/facility-report-setup.models';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';
import { modelingMeters, modelingSnapshot } from '../testing/modeling-report-test-fixtures';
import { ModelingReportEditor } from './modeling-report-editor.service';

describe('Modeling report editor', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const snapshot = modelingSnapshot(), store = new AccountWorkspaceStore();
    store.publish(snapshot, { facility: snapshot.facilities[0] });
    const meters = modelingMeters(snapshot), fingerprint = signal('current');
    const updateSetup = vi.fn(async (_facility, guid, changes) => {
      const latest = store.facilityReports().find(item => item.guid === guid)!;
      const saved = { ...latest, ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.analysisItemId !== undefined ? { analysisItemId: changes.analysisItemId ?? undefined } : {}),
        modelingReportSettings: mergeFacilityModelingSettings(latest.modelingReportSettings, changes.modelingReportSettings) };
      store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [saved] }] }); return saved;
    });
    TestBed.configureTestingModule({ providers: [ModelingReportEditor,
      { provide: FacilityReportActionsService, useValue: { updateSetup } },
      { provide: FacilityReportWorkbenchContext, useValue: { workspace: store, key: () => 'account:facility:modeling-report',
        report: computed(() => store.facilityReports()[0]), facility: computed(() => store.facilities()[0]) } },
      { provide: WorkspaceCalendarizationService, useValue: { currentInputFingerprint: fingerprint,
        calendarizeBase: () => of({ state: 'ready', inputFingerprint: 'current', meters }), project: () => ({ state: 'ready', meters }), retry: vi.fn() } }
    ] });
    const editor = TestBed.inject(ModelingReportEditor); TestBed.tick();
    return { editor, store, updateSetup, fingerprint, snapshot };
  }
  it('hydrates silently and saves only edited switches, including incomplete selections', async () => {
    const { editor, updateSetup, store } = setup();
    expect(editor.setupValid()).toBe(true); expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.analysis.setValue(null); editor.form.controls.settings.controls.includeIssuesSummary.setValue(false);
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('facility', 'modeling-report', {
      analysisItemId: null, modelingReportSettings: { includeIssuesSummary: false }
    });
    expect(editor.setupValid()).toBe(false); expect(store.facilityReports()[0].analysisItemId).toBeUndefined();
  });
  it('preserves unknown saved settings without treating them as form edits or repeating saves', async () => {
    const { editor, store, updateSetup } = setup();
    const report = { ...store.facilityReports()[0], modelingReportSettings: {
      ...store.facilityReports()[0].modelingReportSettings, futureSetting: { enabled: false } } };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] }); TestBed.tick();
    const persist = updateSetup.getMockImplementation()!;
    // A second write is a failure, rather than allowing a broken autosave loop to starve the test.
    updateSetup.mockImplementationOnce(persist).mockRejectedValue(new Error('Unexpected repeated write'));
    editor.form.controls.settings.controls.includeIssuesSummary.setValue(false);
    expect(await editor.flush()).toBe(true); expect(updateSetup).toHaveBeenCalledTimes(1);
    expect(store.facilityReports()[0].modelingReportSettings).toMatchObject({ futureSetting: { enabled: false }, includeIssuesSummary: false });
    expect(editor.state()).toBe('saved');
  });
  it('preserves unavailable references on unrelated edits and blocks unavailable periods', async () => {
    const { editor, store, updateSetup, fingerprint } = setup();
    const report = { ...store.facilityReports()[0], analysisItemId: 'deleted-analysis' };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] }); TestBed.tick();
    editor.name.setValue('Renamed'); expect(await editor.flush()).toBe(true);
    expect(updateSetup.mock.calls[0][2]).toEqual({ name: 'Renamed' }); expect(editor.draft().analysis).toBe('deleted-analysis');
    editor.form.controls.analysis.setValue('facility-analysis'); editor.form.controls.settings.controls.reportYear.setValue(2022);
    expect(await editor.flush()).toBe(true); expect(editor.setupValid()).toBe(true);
    fingerprint.set('changed'); expect(editor.setupValid()).toBe(false);
  });
  it('retains newer edits during a delayed save and merges concurrent untouched switches', async () => {
    const { editor, updateSetup, store } = setup();
    let complete!: (report: IdbFacilityReport) => void;
    updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    editor.form.controls.settings.controls.includeIssuesSummary.setValue(false); const saving = editor.flush();
    editor.form.controls.settings.controls.includeExecutiveSummary.setValue(false);
    const committed = { ...store.facilityReports()[0], modelingReportSettings: {
      ...store.facilityReports()[0].modelingReportSettings, includeIssuesSummary: false, includeDataValidationTables: false } };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [committed] }] }); complete(committed);
    expect(await saving).toBe(true); expect(updateSetup).toHaveBeenCalledTimes(2);
    expect(updateSetup.mock.calls[1][2]).toEqual({ modelingReportSettings: { includeExecutiveSummary: false } });
    expect(editor.draft().settings.includeDataValidationTables).toBe(false);
  });
  it('protects failed saves and retries without losing the draft', async () => {
    const { editor, updateSetup } = setup(); updateSetup.mockRejectedValueOnce(new Error('Disk unavailable'));
    editor.name.setValue('Keep this name'); expect(await editor.flush()).toBe(false);
    expect(editor.needsProtection()).toBe(true); expect(editor.error()).toContain('Disk unavailable');
    editor.retry(); await vi.waitFor(() => expect(editor.state()).toBe('saved'));
    expect(editor.name.value).toBe('Keep this name');
  });
  it('derives partial fiscal years from facility settings without writing a new selection', () => {
    const { editor, store, updateSetup } = setup();
    const facility = { ...store.facilities()[0], fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    store.publishCommittedPatch({ collections: [{ collection: 'facilities', upsert: [facility] }] }); TestBed.tick();
    expect(editor.periods()).toEqual([2022, 2023, 2024, 2025]);
    expect(editor.draft().settings.reportYear).toBe(2023); expect(updateSetup).not.toHaveBeenCalled();
  });
});
