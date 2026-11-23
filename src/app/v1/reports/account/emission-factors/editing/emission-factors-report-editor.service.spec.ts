import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { accountEmissionFactorsSnapshot } from '../testing/emission-factors-fixtures';
import { AccountReportActionsService } from '../../account-report-actions.service';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { AccountEmissionFactorsReportEditor } from './emission-factors-report-editor.service';

describe('Emission Factors typed editing', () => {
  function setup() {
    const snapshot = accountEmissionFactorsSnapshot(), store = new AccountWorkspaceStore(), guid = signal('account-report');
    store.publish(snapshot, { facility: snapshot.facilities[0] });
    const updateSetup = vi.fn(async (reportGuid, changes) => {
      const latest = store.accountReports().find(report => report.guid === reportGuid)!;
      const saved = { ...latest, ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
        ...(changes.startYear !== undefined ? { startYear: changes.startYear ?? undefined } : {}),
        ...(changes.endYear !== undefined ? { endYear: changes.endYear ?? undefined } : {}) };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [saved] }] }); return saved;
    });
    TestBed.configureTestingModule({ providers: [AccountEmissionFactorsReportEditor,
      { provide: AccountReportActionsService, useValue: { updateSetup } },
      { provide: AccountReportWorkbenchContext, useValue: { workspace: store, key: computed(() => `account:facility:${guid()}`),
        report: computed(() => store.accountReports().find(report => report.guid === guid())) } }
    ] });
    const editor = TestBed.inject(AccountEmissionFactorsReportEditor); TestBed.tick();
    return { editor, store, updateSetup, guid };
  }
  afterEach(() => TestBed.resetTestingModule());
  it('hydrates without writing and persists only explicit edits, including incomplete periods', async () => {
    const { editor, updateSetup } = setup();
    expect(editor.setupValid()).toBe(true); expect(await editor.flush()).toBe(true); expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.settings.controls.startYear.setValue(null);
    expect(editor.setupValid()).toBe(false); expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { startYear: null });
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
    let complete!: (report: IdbAccountReport) => void;
    updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    editor.name.setValue('First'); const saving = editor.flush();
    editor.name.setValue('Latest');
    const committed = { ...store.accountReports()[0], name: 'First', startYear: 2021, endYear: 2024 };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [committed] }] }); complete(committed);
    expect(await saving).toBe(true);
    expect(updateSetup).toHaveBeenCalledTimes(2);
    expect(updateSetup.mock.calls[1][1]).toEqual({ name: 'Latest' });
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
    let complete!: (report: IdbAccountReport) => void;
    updateSetup.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    editor.name.setValue('First'); const saving = editor.flush(); editor.name.setValue('Newer');
    const committed = { ...store.accountReports()[0], name: 'First' };
    TestBed.resetTestingModule(); complete(committed);
    expect(await saving).toBe(false); expect(updateSetup).toHaveBeenCalledOnce(); expect(editor.name.value).toBe('Newer');
  });
});
