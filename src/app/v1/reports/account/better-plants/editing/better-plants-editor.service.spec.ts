import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountReportActionsService } from '../../account-report-actions.service';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { BetterPlantsEditor } from './better-plants-editor.service';
import { accountReportSnapshot } from '../../testing/account-report-test-fixtures';
import { reportAnalysisOptions, reportAnalysisToken } from '../../workbench/account-report-workbench.models';

describe('BetterPlantsEditor', () => {
  let store: AccountWorkspaceStore;
  let editor: BetterPlantsEditor;
  let updateSetup: ReturnType<typeof vi.fn>;
  const token = (guid: string) => reportAnalysisToken({ scope: 'account', analysisGuid: guid });
  beforeEach(() => {
    vi.useFakeTimers(); store = new AccountWorkspaceStore();
    const snapshot = accountReportSnapshot();
    snapshot.accountReports[0].reportType = 'betterPlants';
    snapshot.accountReports[0].betterPlantsReportSetup.analysisItemId = 'account-analysis';
    store.publish(snapshot);
    updateSetup = vi.fn(async (_guid, changes) => {
      const latest = store.accountReports()[0];
      const report = { ...latest, ...(changes.reportYear !== undefined ? { reportYear: changes.reportYear ?? undefined } : {}),
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        betterPlantsReportSetup: { ...latest.betterPlantsReportSetup, ...changes.betterPlants,
          ...(changes.analysis !== undefined ? { analysisItemId: changes.analysis?.analysisGuid } : {}) } };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); return report;
    });
    TestBed.configureTestingModule({ providers: [BetterPlantsEditor,
      { provide: AccountReportActionsService, useValue: { updateSetup } },
      { provide: AccountReportWorkbenchContext, useValue: { workspace: store, key: signal('account-a:report'), guid: () => 'account-report',
        report: computed(() => store.accountReports()[0]), usesAnalysis: () => true,
        savedAnalysisValue: computed(() => store.accountReports()[0].betterPlantsReportSetup.analysisItemId ? token(store.accountReports()[0].betterPlantsReportSetup.analysisItemId) : null),
        analysisOptions: computed(() => reportAnalysisOptions(store.accountReports()[0], store.snapshot()!)), needsPairRefresh: () => false, findings: signal([]) } }
    ] }); editor = TestBed.inject(BetterPlantsEditor); TestBed.tick();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });
  it('saves only explicit field edits when a committed refresh changes the analysis link', async () => {
    editor.form.controls.name.setValue('Renamed');
    const latest = { ...store.accountReports()[0], reportYear: 2030, betterPlantsReportSetup: { ...store.accountReports()[0].betterPlantsReportSetup, analysisItemId: 'externally-selected' } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [latest] }] }); TestBed.tick();
    expect(await editor.flush()).toBe(true); TestBed.tick();
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { name: 'Renamed' });
    expect(store.accountReports()[0].betterPlantsReportSetup.analysisItemId).toBe('externally-selected'); expect(store.accountReports()[0].reportYear).toBe(2030);
    expect(editor.form.controls.analysis.value).toBe(token('externally-selected'));
  });
  it('refreshes untouched analysis controls even when the committed publication renders before a delayed save resolves', async () => {
    let resolve!: (report: ReturnType<typeof accountReportSnapshot>['accountReports'][number]) => void;
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.form.controls.name.setValue('Renamed'); const saving = editor.flush();
    const committed = { ...store.accountReports()[0], name: 'Renamed', betterPlantsReportSetup: { ...store.accountReports()[0].betterPlantsReportSetup, analysisItemId: 'external-analysis' } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [committed] }] }); TestBed.tick();
    resolve(committed); expect(await saving).toBe(true);
    expect(editor.form.controls.analysis.value).toBe(token('external-analysis'));
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('account-report', { name: 'Renamed' });
  });
  it('serializes a return to the original field values while an earlier save is in flight', async () => {
    let resolve!: (report: ReturnType<typeof accountReportSnapshot>['accountReports'][number]) => void;
    const original = store.accountReports()[0];
    updateSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.form.patchValue({ name: 'First', analysis: null });
    const first = editor.flush();
    editor.form.patchValue({ name: original.name, analysis: token('account-analysis') });
    expect(editor.flush()).toBe(first);
    const committed = { ...original, name: 'First', betterPlantsReportSetup: { ...original.betterPlantsReportSetup, analysisItemId: undefined } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [committed] }] }); resolve(committed);
    expect(await first).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('account-report', { name: original.name, analysis: { scope: 'account', analysisGuid: 'account-analysis' } });
    expect(store.accountReports()[0].name).toBe(original.name); expect(store.accountReports()[0].betterPlantsReportSetup.analysisItemId).toBe('account-analysis');
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
