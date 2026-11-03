import { mergeFacilityAnalysisSettings } from '@data/account-workspace/facility-report-setup.models';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { reportFacility, reportFixture, reportSnapshot } from '../../testing/report-test-fixtures';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';
import { AnalysisReportEditor } from './analysis-report-editor.service';

describe('AnalysisReportEditor', () => {
  let store: AccountWorkspaceStore;
  let editor: AnalysisReportEditor;
  let updateSetup: ReturnType<typeof vi.fn>;
  let updateName: ReturnType<typeof vi.fn>;
  const guid = signal('report-a');
  beforeEach(() => {
    vi.useFakeTimers();
    guid.set('report-a');
    store = new AccountWorkspaceStore();
    store.publish(reportSnapshot(), { facility: reportFacility });
    updateName = vi.fn(async (_facility: string, reportGuid: string, name: string) => {
      const report = { ...store.facilityReports().find(item => item.guid === reportGuid)!, name };
      store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] });
      return report;
    });
    updateSetup = vi.fn(async (_facility, reportGuid, changes) => {
      const latest = store.facilityReports().find(item => item.guid === reportGuid)!;
      const saved = { ...latest, ...(changes.name !== undefined ? { name: changes.name } : {}), ...(changes.analysisItemId !== undefined ? { analysisItemId: changes.analysisItemId ?? undefined } : {}),
        analysisReportSettings: mergeFacilityAnalysisSettings(latest.analysisReportSettings, changes.analysisReportSettings) };
      store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [saved] }] }); return saved;
    });
    TestBed.configureTestingModule({ providers: [AnalysisReportEditor,
      { provide: FacilityReportActionsService, useValue: { updateName, updateSetup } },
      { provide: FacilityReportWorkbenchContext, useValue: { workspace: store,
        key: computed(() => `${store.account()?.guid}:facility-a:${guid()}`),
        report: computed(() => store.facilityReports().find(item => item.guid === guid()))
      } }
    ] });
    editor = TestBed.inject(AnalysisReportEditor);
    TestBed.tick();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('saves incomplete typed settings without changing untouched durable options or the analysis reference', async () => {
    const current = store.facilityReports()[0];
    const unavailable = { ...current, analysisItemId: 'unavailable', analysisReportSettings: { ...current.analysisReportSettings, groupReports: false } };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [unavailable] }] });
    TestBed.tick();
    expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.settings.controls.analysisTableColumns.controls.savings.setValue(true);
    expect(await editor.flush()).toBe(true);
    expect(updateSetup.mock.calls[0][2]).toEqual({ analysisReportSettings: { analysisTableColumns: { savings: true } } });
    expect(store.facilityReports()[0].analysisItemId).toBe('unavailable');
    expect(store.facilityReports()[0].analysisReportSettings.groupReports).toBe(false);
    expect(editor.setupValid()).toBe(false);
  });

  it('hydrates absent contribution flags without writes and saves only explicitly edited switches', async () => {
    const report = structuredClone(store.facilityReports()[0]);
    delete report.analysisReportSettings.facilityGroupContributions;
    delete report.analysisReportSettings.facilityGroupContributionsTable;
    delete report.analysisReportSettings.facilityGroupContributionsGraphs;
    store.publish({ ...store.snapshot()!, facilityReports: [report] }, { facility: reportFacility });
    TestBed.tick();
    expect(editor.form.controls.settings.getRawValue()).toMatchObject({ facilityGroupContributions: false,
      facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true });
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).not.toHaveBeenCalled();
    expect(store.facilityReports()[0].analysisReportSettings.facilityGroupContributions).toBeUndefined();
    editor.form.controls.settings.patchValue({ facilityGroupContributions: true,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false });
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('facility-a', 'report-a', { analysisReportSettings: {
      facilityGroupContributions: true, facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false
    } });
    expect(store.facilityReports()[0].analysisReportSettings).toMatchObject({ facilityGroupContributions: true,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false });
  });

  it('retains newer settings during a save and merges concurrent untouched column edits', async () => {
    let complete!: (value: ReturnType<typeof reportFixture>) => void;
    updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const controls = editor.form.controls.settings.controls;
    controls.facilityAnnualResultsGraphs.setValue(false);
    const saving = editor.flush();
    controls.groupReports.setValue(false);
    const committed = reportFixture(); committed.analysisReportSettings.facilityAnnualResultsGraphs = false;
    committed.analysisReportSettings.analysisTableColumns.bankedSavings = true;
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [committed] }] });
    complete(committed); expect(await saving).toBe(true);
    expect(updateSetup).toHaveBeenCalledTimes(2);
    expect(updateSetup.mock.calls[1][2]).toEqual({ analysisReportSettings: { groupReports: false } });
    expect(editor.form.controls.settings.controls.analysisTableColumns.controls.bankedSavings.value).toBe(true);
  });

  it('serializes edits made during a save and flushes the latest value before leaving', async () => {
    let resolve!: (report: ReturnType<typeof reportFixture>) => void;
    updateName.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.name.setValue('First');
    const first = editor.flush();
    expect(editor.saving()).toBe(true);
    editor.name.setValue('Latest');
    const second = editor.flush();
    expect(second).toBe(first);
    expect(updateName).toHaveBeenCalledTimes(1);
    const committed = reportFixture({ name: 'First' });
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [committed] }] });
    resolve(committed);
    expect(await first).toBe(true);
    expect(updateName).toHaveBeenCalledTimes(2);
    expect(store.facilityReports()[0].name).toBe('Latest');
    expect(editor.saving()).toBe(false);
  });

  it('preserves a space typed during a delayed save through completion and workspace hydration', async () => {
    let resolve!: (report: ReturnType<typeof reportFixture>) => void;
    updateName.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.name.setValue('Energy');
    const saving = editor.flush();
    editor.name.setValue('Energy ');
    const committed = reportFixture({ name: 'Energy' });
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [committed] }] });
    TestBed.tick();
    expect(editor.name.value).toBe('Energy ');
    resolve(committed);
    expect(await saving).toBe(true);
    expect(editor.name.value).toBe('Energy ');
    TestBed.tick();
    expect(editor.name.value).toBe('Energy ');
    expect(editor.state()).toBe('saved');
    expect(editor.saving()).toBe(false);
    expect(updateName).toHaveBeenCalledTimes(1);

    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [{ ...committed }] }] });
    TestBed.tick();
    expect(editor.name.value).toBe('Energy ');
    editor.name.setValue(`${editor.name.value}Use`);
    expect(await editor.flush()).toBe(true);
    expect(store.facilityReports()[0].name).toBe('Energy Use');
  });


});
