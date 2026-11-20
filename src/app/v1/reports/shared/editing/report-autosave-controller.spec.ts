import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { REPORT_AUTOSAVE_DEBOUNCE_MS, ReportAutosaveController } from './report-autosave-controller';

function setup() {
  const key = signal('report-a'), saved = signal<{ name: string } | undefined>({ name: 'Saved' });
  const name = new FormControl('Saved', { nonNullable: true });
  const persist = vi.fn(async (value: { name: string }) => { saved.set(value); return value; });
  const controller = TestBed.runInInjectionContext(() => new ReportAutosaveController({
    key, saved, canWrite: signal(true), hasPending: signal(false), changes: name.valueChanges,
    read: () => ({ name: name.value }), normalize: value => ({ name: value.name.trim() }), valid: value => !!value.name.trim(),
    hydrate: value => name.setValue(value?.name ?? '', { emitEvent: false }), setEnabled: vi.fn(), persist
  }));
  TestBed.tick();
  return { key, saved, name, persist, controller };
}

describe('report autosave deletion hold', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('cancels a queued save and permanently stops writes after completion even when the saved record disappears', async () => {
    const view = setup(); view.name.setValue('Queued');
    expect(await view.controller.beginDeletion()).toBe(true);
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS + 1);
    expect(view.persist).not.toHaveBeenCalled(); expect(view.controller.canEdit()).toBe(false);
    view.saved.set(undefined); TestBed.tick();
    expect(view.name.value).toBe('Queued');
    view.controller.completeDeletion(); view.controller.resumeAutosave(); view.controller.retry();
    expect(await view.controller.flush()).toBe(true);
    expect(view.controller.needsProtection()).toBe(false);
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS + 1);
    expect(view.persist).not.toHaveBeenCalled();
  });

  it('waits for a submitted save without sending its newer invalid draft and preserves that draft on cancellation', async () => {
    const view = setup(); let finish!: () => void;
    view.persist.mockImplementationOnce(value => new Promise(resolve => { finish = () => { view.saved.set(value); resolve(value); }; }));
    view.name.setValue('Submitted'); const saving = view.controller.flush();
    view.name.setValue('');
    let prepared = false; const preparing = view.controller.beginDeletion().then(ready => { prepared = ready; });
    await Promise.resolve(); expect(prepared).toBe(false);
    finish(); await saving; await preparing; TestBed.tick();
    expect(prepared).toBe(true); expect(view.name.value).toBe(''); expect(view.persist).toHaveBeenCalledOnce();
    view.controller.cancelDeletion();
    expect(view.controller.state()).toBe('invalid'); expect(await view.controller.flush()).toBe(false);
    expect(view.name.value).toBe('');
  });

  it('allows confirmation after a failed submitted save and preserves the save error on cancellation', async () => {
    const view = setup(); let fail!: () => void;
    view.persist.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = () => reject(new Error('Disk full')); }));
    view.name.setValue('Draft'); const saving = view.controller.flush(), preparing = view.controller.beginDeletion();
    fail(); expect(await saving).toBe(false); expect(await preparing).toBe(true);
    view.controller.cancelDeletion();
    expect(view.name.value).toBe('Draft'); expect(view.controller.error()).toBe('Disk full');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS + 1);
    expect(view.persist).toHaveBeenCalledOnce();
  });

  it.each(['context change', 'teardown'])('rejects stale preparation after %s without changing the replacement editor', async change => {
    const view = setup(); let finish!: () => void;
    view.persist.mockImplementationOnce(value => new Promise(resolve => { finish = () => resolve(value); }));
    view.name.setValue('Old draft'); const saving = view.controller.flush(), preparing = view.controller.beginDeletion();
    if (change === 'teardown') TestBed.resetTestingModule();
    else { view.key.set('report-b'); view.saved.set({ name: 'Replacement' }); TestBed.tick(); }
    finish(); await saving; expect(await preparing).toBe(false);
    if (change === 'context change') expect(view.name.value).toBe('Replacement');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS + 1);
    expect(view.persist).toHaveBeenCalledOnce();
  });
});
