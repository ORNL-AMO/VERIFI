import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { REPORT_AUTOSAVE_DEBOUNCE_MS } from '@app/v1/shared/reports/report-autosave-controller';
import { AccountReportActionsService } from '../account-report-actions.service';
import { AccountReportWorkbenchContext } from './account-report-workbench-context.service';
import { AccountReportAutosaveService } from './account-report-autosave.service';
import { accountReportSnapshot } from '../testing/account-report-test-fixtures';
import { reportAnalysisOptions, reportAnalysisToken } from './account-report-workbench.models';

describe('account report autosave', () => {
  let store: AccountWorkspaceStore;
  let editor: AccountReportAutosaveService;
  let updateSetup: ReturnType<typeof vi.fn>;
  const token = (guid: string) => reportAnalysisToken({ scope: 'account', analysisGuid: guid });
  beforeEach(() => {
    vi.useFakeTimers(); store = new AccountWorkspaceStore(); store.publish(accountReportSnapshot());
    updateSetup = vi.fn(async (_guid, changes) => {
      const latest = store.accountReports()[0];
      const report = { ...latest, ...(changes.reportYear !== undefined ? { reportYear: changes.reportYear ?? undefined } : {}),
        ...(changes.betterPlants ? { betterPlantsReportSetup: { ...latest.betterPlantsReportSetup, ...changes.betterPlants } } : {}), ...(changes.name !== undefined ? { name: changes.name } : {}),
        analysisReportSetup: { ...latest.analysisReportSetup, ...(changes.analysis !== undefined ? { analysisItemId: changes.analysis?.analysisGuid } : {}) } };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); return report;
    });
    TestBed.configureTestingModule({ providers: [AccountReportAutosaveService,
      { provide: AccountReportActionsService, useValue: { updateSetup } },
      { provide: AccountReportWorkbenchContext, useValue: { workspace: store, key: signal('account-a:report'), guid: () => 'account-report',
        report: computed(() => store.accountReports()[0]), usesAnalysis: () => true,
        savedAnalysisValue: computed(() => store.accountReports()[0].analysisReportSetup.analysisItemId ? token(store.accountReports()[0].analysisReportSetup.analysisItemId) : null),
        analysisOptions: computed(() => reportAnalysisOptions(store.accountReports()[0], store.snapshot()!)), needsPairRefresh: () => false } }
    ] }); editor = TestBed.inject(AccountReportAutosaveService); TestBed.tick();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });
  it('hydrates without writes and debounces name changes without requiring an analysis selection', async () => {
    const report = { ...store.accountReports()[0], analysisReportSetup: { ...store.accountReports()[0].analysisReportSetup, analysisItemId: undefined } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); TestBed.tick();
    expect(updateSetup).not.toHaveBeenCalled(); editor.form.controls.name.setValue(' New name ');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS - 1); expect(updateSetup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { name: 'New name' });
    expect(editor.form.controls.analysis.value).toBeNull(); expect(editor.state()).toBe('saved');
  });
  it('saves only explicit field edits when a committed refresh changes the analysis link', async () => {
    editor.form.controls.name.setValue('Renamed');
    const latest = { ...store.accountReports()[0], reportYear: 2030, analysisReportSetup: { ...store.accountReports()[0].analysisReportSetup, analysisItemId: 'externally-selected' } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [latest] }] }); TestBed.tick();
    expect(await editor.flush()).toBe(true); TestBed.tick();
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { name: 'Renamed' });
    expect(store.accountReports()[0].analysisReportSetup.analysisItemId).toBe('externally-selected'); expect(store.accountReports()[0].reportYear).toBe(2030);
    expect(editor.form.controls.analysis.value).toBe(token('externally-selected'));
  });
  it('preserves missing references on rename and clears them only through an explicit selection edit', async () => {
    const report = { ...store.accountReports()[0], analysisReportSetup: { ...store.accountReports()[0].analysisReportSetup, analysisItemId: 'missing' } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); TestBed.tick();
    editor.form.controls.name.setValue('Renamed'); expect(await editor.flush()).toBe(true); TestBed.tick();
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { name: 'Renamed' });
    editor.form.controls.analysis.setValue(null); expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { analysis: null });
  });
  it('refreshes untouched analysis controls even when the committed publication renders before a delayed save resolves', async () => {
    let resolve!: (report: ReturnType<typeof accountReportSnapshot>['accountReports'][number]) => void;
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.form.controls.name.setValue('Renamed'); const saving = editor.flush();
    const committed = { ...store.accountReports()[0], name: 'Renamed', analysisReportSetup: { ...store.accountReports()[0].analysisReportSetup, analysisItemId: 'external-analysis' } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [committed] }] }); TestBed.tick();
    resolve(committed); expect(await saving).toBe(true);
    expect(editor.form.controls.analysis.value).toBe(token('external-analysis'));
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { name: 'Renamed' });
  });
  it('retains failed drafts for retry and blocks invalid names without writing', async () => {
    editor.form.controls.name.setValue(' '); expect(await editor.flush()).toBe(false); expect(updateSetup).not.toHaveBeenCalled(); editor.discard();
    updateSetup.mockRejectedValueOnce(new Error('Save failed')); editor.form.controls.analysis.setValue(null);
    expect(await editor.flush()).toBe(false); expect(editor.error()).toBe('Save failed'); expect(editor.form.controls.analysis.value).toBeNull();
    editor.retry(); expect(await editor.flush()).toBe(true); expect(editor.error()).toBeUndefined();
  });
  it.each([false, true])('reconciles a concurrent rename after whitespace normalization while preserving newer input: %s', async newerInput => {
    let resolve!: (report: ReturnType<typeof accountReportSnapshot>['accountReports'][number]) => void;
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.form.controls.name.setValue(`${store.accountReports()[0].name} `);
    editor.form.controls.analysis.setValue(null);
    const saving = editor.flush();
    const committed = { ...store.accountReports()[0], name: 'Concurrent rename',
      analysisReportSetup: { ...store.accountReports()[0].analysisReportSetup, analysisItemId: undefined } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [committed] }] }); TestBed.tick();
    if (newerInput) editor.form.controls.name.setValue('Newer name ');
    resolve(committed); expect(await saving).toBe(true); TestBed.tick();
    expect(updateSetup).toHaveBeenNthCalledWith(1, 'account-report', { analysis: null });
    expect(updateSetup).toHaveBeenCalledTimes(newerInput ? 2 : 1);
    if (newerInput) expect(updateSetup).toHaveBeenLastCalledWith('account-report', { name: 'Newer name' });
    expect(store.accountReports()[0].name).toBe(newerInput ? 'Newer name' : 'Concurrent rename');
    expect(editor.form.controls.name.value).toBe(newerInput ? 'Newer name' : 'Concurrent rename');
    expect(editor.state()).toBe('saved');
  });
  it('serializes a return to the original field values while an earlier save is in flight', async () => {
    let resolve!: (report: ReturnType<typeof accountReportSnapshot>['accountReports'][number]) => void;
    const original = store.accountReports()[0];
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.form.patchValue({ name: 'First', analysis: null });
    const first = editor.flush();
    editor.form.patchValue({ name: original.name, analysis: token('account-analysis') });
    expect(editor.flush()).toBe(first);
    const committed = { ...original, name: 'First', analysisReportSetup: { ...original.analysisReportSetup, analysisItemId: undefined } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [committed] }] }); resolve(committed);
    expect(await first).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { name: original.name, analysis: { scope: 'account', analysisGuid: 'account-analysis' } });
    expect(store.accountReports()[0].name).toBe(original.name); expect(store.accountReports()[0].analysisReportSetup.analysisItemId).toBe('account-analysis');
  });
  it('saves only changed Better Plants fields and leaves absent legacy options untouched', async () => {
    const report = { ...store.accountReports()[0], reportType: 'betterPlants' as const };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); TestBed.tick();
    expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.betterPlants.controls.reportYear.setValue(2025);
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { reportYear: 2025 });
    expect(store.accountReports()[0].betterPlantsReportSetup.includeAllYears).toBeUndefined();
    editor.form.controls.betterPlants.controls.modificationNotes.setValue('New controls');
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { betterPlants: { modificationNotes: 'New controls' } });
  });
  it('retains invalid numeric drafts and allows incomplete report setup to be saved', async () => {
    const report = { ...store.accountReports()[0], reportType: 'betterPlants' as const };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); TestBed.tick();
    editor.form.controls.betterPlants.controls.reportYear.setValue(2023.5);
    expect(editor.state()).toBe('invalid'); expect(await editor.flush()).toBe(false);
    expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.betterPlants.controls.reportYear.setValue(null);
    expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { reportYear: null });
  });

});
