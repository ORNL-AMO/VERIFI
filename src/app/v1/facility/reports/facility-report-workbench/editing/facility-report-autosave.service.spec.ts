import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { reportFacility, reportFixture, reportSnapshot } from '../../testing/report-test-fixtures';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';
import { FacilityReportAutosaveService, REPORT_AUTOSAVE_DEBOUNCE_MS } from './facility-report-autosave.service';

describe('FacilityReportAutosaveService', () => {
  let store: AccountWorkspaceStore;
  let editor: FacilityReportAutosaveService;
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
    TestBed.configureTestingModule({ providers: [FacilityReportAutosaveService,
      { provide: FacilityReportActionsService, useValue: { updateName } },
      { provide: FacilityReportWorkbenchContext, useValue: { workspace: store,
        key: computed(() => `${store.account()?.guid}:facility-a:${guid()}`),
        report: computed(() => store.facilityReports().find(item => item.guid === guid()))
      } }
    ] });
    editor = TestBed.inject(FacilityReportAutosaveService);
    TestBed.tick();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('hydrates without writing, debounces real edits, and skips unchanged trimmed names', async () => {
    expect(editor.name.value).toBe('Saved report');
    expect(updateName).not.toHaveBeenCalled();
    editor.name.setValue(' Saved report ');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS);
    expect(updateName).not.toHaveBeenCalled();
    editor.name.setValue('First');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS - 1);
    expect(updateName).not.toHaveBeenCalled();
    editor.name.setValue(' Final ');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS);
    expect(updateName).toHaveBeenCalledExactlyOnceWith('facility-a', 'report-a', 'Final');
    expect(editor.state()).toBe('saved');
    expect(editor.name.value).toBe('Final');
  });

  it('blocks invalid or failed drafts, supports retry, and discards explicitly', async () => {
    editor.name.setValue('   ');
    expect(await editor.flush()).toBe(false);
    expect(editor.state()).toBe('invalid');
    expect(updateName).not.toHaveBeenCalled();
    editor.discard();
    expect(editor.name.value).toBe('Saved report');
    updateName.mockRejectedValueOnce(new Error('Disk unavailable'));
    editor.name.setValue('Unsaved');
    expect(await editor.flush()).toBe(false);
    expect(editor.error()).toBe('Disk unavailable');
    expect(editor.name.value).toBe('Unsaved');
    expect(await TestBed.inject(UnsavedChangesService).flushPendingChanges()).toBe(false);
    editor.retry();
    expect(await editor.flush()).toBe(true);
    expect(editor.name.value).toBe('Unsaved');
    expect(editor.error()).toBeUndefined();
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

  it('retains whitespace-only edits on a workspace refresh without issuing a redundant save', async () => {
    editor.name.setValue('Saved report ');
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [reportFixture()] }] });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS);
    expect(editor.name.value).toBe('Saved report ');
    expect(editor.state()).toBe('saved');
    expect(updateName).not.toHaveBeenCalled();
    editor.discard();
    expect(editor.name.value).toBe('Saved report');
  });

  it('retains newer raw edits even when the user returns to the submitted input', async () => {
    let resolve!: (report: ReturnType<typeof reportFixture>) => void;
    updateName.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.name.setValue(' Energy ');
    const saving = editor.flush();
    editor.name.setValue(' Energy U');
    editor.name.setValue(' Energy ');
    const committed = reportFixture({ name: 'Energy' });
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [committed] }] });
    resolve(committed);
    expect(await saving).toBe(true);
    TestBed.tick();
    expect(editor.name.value).toBe(' Energy ');
    expect(updateName).toHaveBeenCalledTimes(1);
  });

  it('hydrates committed updates again after edits are reverted to the exact saved name', () => {
    editor.name.setValue('Draft');
    editor.name.setValue('Saved report');
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [reportFixture({ name: 'Updated report' })] }] });
    TestBed.tick();
    expect(editor.name.value).toBe('Updated report');
    expect(updateName).not.toHaveBeenCalled();
  });

  it('does not overwrite a new report draft when an old save finishes after context changes', async () => {
    let resolve!: (report: ReturnType<typeof reportFixture>) => void;
    updateName.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    editor.name.setValue('Old draft');
    const saving = editor.flush();
    const other = reportFixture({ id: 20, guid: 'report-b', name: 'Other report' });
    store.publish(reportSnapshot([reportFixture(), other]), { facility: reportFacility });
    guid.set(other.guid);
    TestBed.tick();
    expect(editor.name.value).toBe('Other report');
    resolve(reportFixture({ name: 'Old draft' }));
    expect(await saving).toBe(false);
    expect(editor.name.value).toBe('Other report');
    expect(editor.state()).toBe('idle');
  });

  it('cancels a queued save and unregisters navigation protection on destruction', async () => {
    editor.name.setValue('Draft');
    const unsaved = TestBed.inject(UnsavedChangesService);
    expect(unsaved.hasUnsavedChanges()).toBe(true);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS);
    expect(updateName).not.toHaveBeenCalled();
    expect(unsaved.hasUnsavedChanges()).toBe(false);
  });
});
