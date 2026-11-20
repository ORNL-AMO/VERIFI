import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { mergeFacilityEmissionFactorsSettings } from '@data/account-workspace/facility-report-setup.models';
import { emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../../workbench/facility-report-workbench-context.service';
import { EmissionFactorsReportEditor } from './emission-factors-report-editor.service';

describe('Emission Factors typed editing', () => {
  function setup() {
    const snapshot = emissionFactorsSnapshot(), store = new AccountWorkspaceStore(), guid = signal('report-a');
    store.publish(snapshot, { facility: snapshot.facilities[0] });
    const updateSetup = vi.fn(async (_facility, reportGuid, changes) => {
      const latest = store.facilityReports().find(report => report.guid === reportGuid)!;
      const saved = { ...latest, ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
        emissionFactorsReportSettings: mergeFacilityEmissionFactorsSettings(latest.emissionFactorsReportSettings, changes.emissionFactorsReportSettings) };
      store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [saved] }] }); return saved;
    });
    TestBed.configureTestingModule({ providers: [EmissionFactorsReportEditor,
      { provide: FacilityReportActionsService, useValue: { updateSetup } },
      { provide: FacilityReportWorkbenchContext, useValue: { workspace: store, key: computed(() => `account:facility:${guid()}`),
        report: computed(() => store.facilityReports().find(report => report.guid === guid())) } }
    ] });
    const editor = TestBed.inject(EmissionFactorsReportEditor); TestBed.tick();
    return { editor, store, updateSetup, guid };
  }
  afterEach(() => TestBed.resetTestingModule());
  it('hydrates without writing and persists only explicit edits, including incomplete periods', async () => {
    const { editor, updateSetup } = setup();
    expect(editor.setupValid()).toBe(true); expect(await editor.flush()).toBe(true); expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.settings.controls.startYear.setValue(null);
    expect(editor.setupValid()).toBe(false); expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('facility', 'report-a', { emissionFactorsReportSettings: { startYear: null } });
  });
  it('saves equal or reversed periods as drafts but prevents progression and malformed years', async () => {
    const { editor, updateSetup } = setup();
    editor.form.controls.settings.controls.startYear.setValue(2024);
    expect(await editor.flush()).toBe(true); expect(editor.setupValid()).toBe(false);
    editor.form.controls.settings.controls.startYear.setValue(2025);
    expect(await editor.flush()).toBe(true); expect(editor.setupValid()).toBe(false);
    editor.form.controls.settings.controls.startYear.setValue(Infinity);
    expect(await editor.flush()).toBe(false); expect(updateSetup).toHaveBeenCalledTimes(2);
  });
  it('merges concurrent untouched years while serializing edits made during a delayed save', async () => {
    const { editor, updateSetup, store } = setup();
    let complete!: (report: IdbFacilityReport) => void;
    updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    editor.name.setValue('First'); const saving = editor.flush();
    editor.name.setValue('Latest');
    const committed = { ...store.facilityReports()[0], name: 'First', emissionFactorsReportSettings: { startYear: 2021, endYear: 2024 } };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [committed] }] }); complete(committed);
    expect(await saving).toBe(true);
    expect(updateSetup).toHaveBeenCalledTimes(2);
    expect(updateSetup.mock.calls[1][2]).toEqual({ name: 'Latest' });
    expect(editor.draft()).toMatchObject({ name: 'Latest', settings: { startYear: 2021 } });
  });
  it('retains a failed draft for retry and refuses a blank name', async () => {
    const { editor, updateSetup } = setup();
    updateSetup.mockRejectedValueOnce(new Error('Disk unavailable'));
    editor.name.setValue('Retained'); expect(await editor.flush()).toBe(false);
    expect(editor.error()).toBe('Disk unavailable'); expect(editor.draft().name).toBe('Retained');
    editor.retry(); await editor.flush(); expect(editor.state()).toBe('saved');
    editor.name.setValue(' '); expect(await editor.flush()).toBe(false); expect(editor.setupValid()).toBe(false);
  });
  it('does not rebase or save to a departed report after its session is destroyed', async () => {
    const { editor, updateSetup, store } = setup();
    let complete!: (report: IdbFacilityReport) => void;
    updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    editor.name.setValue('First'); const saving = editor.flush(); editor.name.setValue('Newer');
    const committed = { ...store.facilityReports()[0], name: 'First' };
    TestBed.resetTestingModule(); complete(committed);
    expect(await saving).toBe(false); expect(updateSetup).toHaveBeenCalledOnce(); expect(editor.name.value).toBe('Newer');
  });
});
