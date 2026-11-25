import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountReportSetupChanges } from '@data/account-workspace/account-report-setup.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { AccountReportActionsService } from '../../account-report-actions.service';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { reportAnalysisOptions, reportAnalysisToken } from '../../workbench/account-report-workbench.models';
import { accountModelingSnapshot, modelingBase } from '../testing/modeling-report-test-fixtures';
import { AccountModelingReportEditor } from './modeling-report-editor.service';

describe('account Modeling report editing', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });
  function setup() {
    vi.useFakeTimers();
    const snapshot = accountModelingSnapshot();
    snapshot.meterData = snapshot.meterData.filter(row => row.year !== 2024 || row.month <= 3);
    snapshot.accountReports[0].analysisReportSetup.includeProblemsInformation = false;
    const store = new AccountWorkspaceStore(); store.publish(snapshot);
    const refresh = signal(false);
    const savedAnalysisValue = computed(() => {
      const guid = store.accountReports()[0].analysisReportSetup.analysisItemId;
      return guid ? reportAnalysisToken({ scope: 'account', analysisGuid: guid }) : null;
    });
    const updateSetup = vi.fn(async (_guid: string, changes: AccountReportSetupChanges) => {
      const latest = store.accountReports()[0];
      const report = { ...latest, ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.reportYear !== undefined ? { reportYear: changes.reportYear ?? undefined } : {}),
        analysisReportSetup: { ...latest.analysisReportSetup, ...changes.modeling,
          ...(changes.analysis !== undefined ? { analysisItemId: changes.analysis?.analysisGuid } : {}) } };
      store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [report] }] }); return report;
    });
    TestBed.configureTestingModule({ providers: [AccountModelingReportEditor,
      { provide: AccountReportActionsService, useValue: { updateSetup } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of(modelingBase(snapshot)), currentInputFingerprint: () => 'current' } },
      { provide: AccountReportWorkbenchContext, useValue: { workspace: store, key: signal('account:report'),
        report: computed(() => store.accountReports()[0]), savedAnalysisValue, needsPairRefresh: refresh,
        analysisOptions: computed(() => reportAnalysisOptions(store.accountReports()[0], store.snapshot()!)) } }
    ] });
    const editor = TestBed.inject(AccountModelingReportEditor); TestBed.tick();
    return { editor, store, updateSetup, refresh };
  }
  it('preserves saved false flags without writes and offers baseline and partial years', () => {
    const { editor, updateSetup } = setup();
    expect(editor.draft().settings.includeIssuesSummary).toBe(false);
    expect(editor.periods()).toEqual([2022, 2023, 2024]); expect(updateSetup).not.toHaveBeenCalled();
    editor.form.controls.settings.controls.reportYear.setValue(2022); expect(editor.setupValid()).toBe(true);
    editor.form.controls.settings.controls.reportYear.setValue(2021); expect(editor.setupValid()).toBe(false);
    expect(editor.draft().settings.reportYear).toBe(2021);
  });
  it('patches only edited fields and preserves concurrent links and options', async () => {
    const { editor, store, updateSetup } = setup();
    editor.form.controls.settings.controls.includeIssuesSummary.setValue(true);
    const latest = store.accountReports()[0];
    const updated = { ...latest, reportYear: 2024,
      analysisReportSetup: { ...latest.analysisReportSetup, analysisItemId: 'external', includeExecutiveSummary: false } };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [updated] }] });
    TestBed.tick(); expect(await editor.flush()).toBe(true); TestBed.tick();
    expect(updateSetup).toHaveBeenCalledExactlyOnceWith('report', { modeling: { includeProblemsInformation: true } });
    expect(editor.form.controls.analysis.value).toContain('external');
    expect(editor.draft().settings).toMatchObject({ reportYear: 2024, includeExecutiveSummary: false });
  });
  it('retains failed drafts, retries and saves clear selections without touching content', async () => {
    const { editor, updateSetup } = setup();
    updateSetup.mockRejectedValueOnce(new Error('Save failed'));
    editor.form.controls.analysis.setValue(null); expect(await editor.flush()).toBe(false);
    expect(editor.error()).toBe('Save failed'); expect(editor.form.controls.analysis.value).toBeNull();
    editor.retry(); expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('report', { analysis: null });
  });
  it('preserves newer edits typed while saving', async () => {
    const { editor, updateSetup } = setup();
    const persist = updateSetup.getMockImplementation()!;
    let release!: () => void;
    updateSetup.mockImplementationOnce(async (...args) => { await new Promise<void>(resolve => release = resolve); return persist(...args); });
    editor.name.setValue('First'); const saving = editor.flush();
    editor.name.setValue('Second'); release();
    expect(await saving).toBe(true); TestBed.tick();
    expect(editor.name.value).toBe('Second'); expect(updateSetup).toHaveBeenLastCalledWith('report', { name: 'Second' });
  });
  it('requires an explicit hidden-pair refresh and protects a draft during deletion', async () => {
    const { editor, updateSetup, refresh } = setup(); refresh.set(true); expect(editor.setupValid()).toBe(false);
    editor.name.setValue('Keep draft'); expect(await editor.beginDeletion()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000); expect(updateSetup).not.toHaveBeenCalled();
    editor.cancelDeletion(); expect(await editor.flush()).toBe(true);
    expect(updateSetup).toHaveBeenLastCalledWith('report', { name: 'Keep draft' });
  });
});
