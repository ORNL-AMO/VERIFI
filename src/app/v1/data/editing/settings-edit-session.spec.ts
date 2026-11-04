import { Component, InjectionToken, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { EditorConflictError, reconcileFields } from './draft-reconciliation';
import { EditSaveMode, SettingsEditAdapter, injectSettingsEditSession } from './settings-edit-session';

interface Values { name: string; notes: string; }
const SESSION_ADAPTER = new InjectionToken<SettingsEditAdapter<Values>>('Settings edit adapter');

@Component({ standalone: true, template: '' })
class SettingsEditHost {
  readonly session = injectSettingsEditSession(inject(SESSION_ADAPTER));
}

describe('SettingsEditSession', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('hydrates silently, deduplicates changes, and does not register a navigation flush', async () => {
    vi.useFakeTimers();
    const test = setup();
    expect(test.draft).toEqual({ name: 'Original', notes: '' });
    test.edit({});
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.persist).not.toHaveBeenCalled();
    expect(test.register.mock.calls[0]).toHaveLength(3);
    expect(test.session.dirty()).toBe(false);
  });

  it('keeps editing enabled during its own save/reload and waits for the latest edit deadline', async () => {
    vi.useFakeTimers();
    const first = deferred<Values>();
    const test = setup();
    test.persist.mockImplementationOnce(() => first.promise);
    test.edit({ name: 'First' }, 'immediate');
    await vi.advanceTimersByTimeAsync(0);
    test.owners.set([test.session.ownerId]); test.canWrite.set(false); TestBed.tick();
    expect(test.session.canEdit()).toBe(true);
    test.edit({ name: 'Second' });
    await vi.advanceTimersByTimeAsync(100);
    test.saved.set({ name: 'First', notes: '' }); first.resolve({ name: 'First', notes: '' });
    await vi.advanceTimersByTimeAsync(0);
    test.saved.set({ name: 'First', notes: '' }); test.canWrite.set(true); test.owners.set([]); TestBed.tick();
    expect(test.session.dirty()).toBe(true);
    expect(test.persist).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(549);
    expect(test.persist).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1][0]).toEqual({ name: 'Second', notes: '' });
  });

  it('persists a reversion made while the previous value is still saving', async () => {
    vi.useFakeTimers();
    const first = deferred<Values>(); const test = setup();
    test.persist.mockImplementationOnce(() => first.promise);
    test.edit({ name: 'First' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    test.edit({ name: 'Original' });
    test.saved.set({ name: 'First', notes: '' }); first.resolve({ name: 'First', notes: '' }); await vi.advanceTimersByTimeAsync(650);
    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1][0]).toEqual({ name: 'Original', notes: '' });
  });

  it('acknowledges canonical untouched values merged by a queued command without a duplicate save', async () => {
    vi.useFakeTimers(); const test = setup(); const first = deferred<Values>();
    test.persist.mockImplementationOnce(() => first.promise);
    test.edit({ name: 'Mine' }, 'immediate');
    test.saved.set({ name: 'Mine', notes: 'Latest saved note' }); first.resolve(test.saved()!);
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.draft).toEqual({ name: 'Mine', notes: 'Latest saved note' });
    expect(test.session.state()).toBe('saved'); expect(test.session.dirty()).toBe(false);
    expect(test.persist).toHaveBeenCalledOnce();
  });

  it('does not save an invalid draft and retains failed values for explicit retry', async () => {
    vi.useFakeTimers(); const test = setup();
    test.edit({ name: '' }); await vi.advanceTimersByTimeAsync(650);
    expect(test.session.state()).toBe('invalid'); expect(test.persist).not.toHaveBeenCalled();
    test.persist.mockRejectedValueOnce(new Error('Offline'));
    test.edit({ name: 'Retry me' }); await vi.advanceTimersByTimeAsync(650);
    expect(test.session.state()).toBe('error'); expect(test.draft.name).toBe('Retry me');
    await vi.advanceTimersByTimeAsync(5000); expect(test.persist).toHaveBeenCalledTimes(1);
    test.session.retry(); await vi.advanceTimersByTimeAsync(0);
    expect(test.persist).toHaveBeenCalledTimes(2); expect(test.session.dirty()).toBe(false);
  });

  it('merges committed untouched fields and pauses overlapping edits for explicit choices', async () => {
    vi.useFakeTimers(); const test = setup();
    test.edit({ name: 'Mine' });
    test.saved.set({ name: 'Original', notes: 'Saved note' }); TestBed.tick();
    expect(test.draft).toEqual({ name: 'Mine', notes: 'Saved note' });
    test.saved.set({ name: 'Theirs', notes: 'Saved note' }); TestBed.tick();
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.session.state()).toBe('conflict'); expect(test.persist).not.toHaveBeenCalled();
    test.session.resolveConflicts({ name: 'local' }); await vi.advanceTimersByTimeAsync(0);
    expect(test.persist.mock.calls[0][0]).toEqual({ name: 'Mine', notes: 'Saved note' });
  });

  it('handles execution-time conflicts wrapped by the command boundary', async () => {
    vi.useFakeTimers(); const test = setup();
    test.persist.mockImplementationOnce(async () => {
      test.saved.set({ name: 'Theirs', notes: '' });
      throw { cause: new EditorConflictError({ name: 'Theirs', notes: '' }) };
    });
    test.edit({ name: 'Mine' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.conflicts()).toEqual([expect.objectContaining({ id: 'name' })]);
    expect(test.session.state()).toBe('conflict'); expect(test.draft.name).toBe('Mine');
  });

  it('keeps only the original conflict while untouched saved fields change repeatedly', async () => {
    vi.useFakeTimers(); const test = setup(); test.edit({ name: 'Mine' });
    test.saved.set({ name: 'Theirs', notes: 'First' }); TestBed.tick();
    test.saved.set({ name: 'Theirs', notes: 'Second' }); TestBed.tick();
    expect(test.draft).toEqual({ name: 'Mine', notes: 'Second' });
    expect(test.session.conflicts().map(item => item.id)).toEqual(['name']);
    test.session.resolveConflicts({ name: 'local' }); await vi.advanceTimersByTimeAsync(0);
    expect(test.persist.mock.calls[0][0]).toEqual({ name: 'Mine', notes: 'Second' });
  });

  it('clears the missing-target error when an identical saved item is restored', () => {
    const test = setup(); const original = test.saved();
    test.saved.set(undefined); TestBed.tick();
    expect(test.session.state()).toBe('error'); expect(test.session.canEdit()).toBe(false);
    test.saved.set(original); TestBed.tick();
    expect(test.session.state()).toBe('saved'); expect(test.session.error()).toBeUndefined();
    expect(test.session.canEdit()).toBe(true); expect(test.session.dirty()).toBe(false);
  });

  it('resolves a conflict with changes committed during an in-flight save against the submitted baseline', async () => {
    vi.useFakeTimers(); const test = setup(); const first = deferred<Values>();
    test.persist.mockImplementationOnce(() => first.promise);
    test.edit({ name: 'First' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    test.edit({ notes: 'My later note' });
    test.saved.set({ name: 'First', notes: 'Remote note' }); first.resolve(test.saved()!);
    await vi.advanceTimersByTimeAsync(0);
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['notes']);
    test.session.resolveConflicts({ notes: 'saved' });
    expect(test.draft).toEqual({ name: 'First', notes: 'Remote note' });
    expect(test.session.conflicts()).toEqual([]); expect(test.session.dirty()).toBe(false);
  });

  it('preserves failed drafts on refresh and restores the latest saved value on discard', async () => {
    vi.useFakeTimers(); const test = setup();
    test.persist.mockRejectedValueOnce(new Error('Failed'));
    test.edit({ name: 'Mine' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    test.saved.set({ name: 'Original', notes: 'New saved note' }); TestBed.tick();
    expect(test.session.state()).toBe('error'); expect(test.draft.name).toBe('Mine');
    test.session.discard();
    expect(test.draft).toEqual({ name: 'Original', notes: 'New saved note' });
    expect(test.session.dirty()).toBe(false);
  });

  it('blocks unrelated pending work and ignores completion after identity changes', async () => {
    vi.useFakeTimers(); const test = setup(); const first = deferred<Values>();
    test.owners.set(['another-editor']); TestBed.tick();
    expect(test.session.canEdit()).toBe(false);
    test.owners.set([]); TestBed.tick(); test.persist.mockImplementationOnce(() => first.promise);
    test.edit({ name: 'Old session' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    test.key.set('account:facility:second'); test.saved.set({ name: 'Second', notes: '' }); TestBed.tick();
    first.resolve({ name: 'Old session', notes: '' }); await vi.advanceTimersByTimeAsync(0);
    expect(test.draft.name).toBe('Second'); expect(test.session.dirty()).toBe(false);
  });

  it('cancels queued saves and releases its subscriptions and protection when its host is destroyed', async () => {
    vi.useFakeTimers(); const test = setup(); test.edit({ name: 'Unsaved' });
    expect(test.changes.observed).toBe(true); expect(test.session.canEdit()).toBe(true);
    test.destroy();
    expect(test.session.canEdit()).toBe(false); expect(test.session.dirty()).toBe(false);
    expect(test.session.saving()).toBe(false); expect(test.changes.observed).toBe(false);
    expect(test.unregister).toHaveBeenCalledOnce();
    test.hydrate.mockClear(); test.setEnabled.mockClear();
    test.saved.set({ name: 'Later saved item', notes: '' }); test.edit({ name: 'Late event' }, 'immediate');
    TestBed.tick(); await vi.advanceTimersByTimeAsync(1000);
    expect(test.persist).not.toHaveBeenCalled(); expect(test.hydrate).not.toHaveBeenCalled();
    expect(test.setEnabled).not.toHaveBeenCalled();
    await expect(test.session.saveNow()).resolves.toBe(false);
  });

  it('ignores an in-flight completion after its host is destroyed', async () => {
    vi.useFakeTimers(); const test = setup(); const pending = deferred<Values>();
    test.persist.mockImplementationOnce(() => pending.promise);
    test.edit({ name: 'Submitted' }, 'immediate'); expect(test.session.saving()).toBe(true);
    test.destroy(); test.hydrate.mockClear();
    pending.resolve({ name: 'Submitted', notes: 'Canonical note' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.hydrate).not.toHaveBeenCalled(); expect(test.persist).toHaveBeenCalledOnce();
    expect(test.session.canEdit()).toBe(false); expect(test.session.saving()).toBe(false);
    expect(test.session.state()).toBe('idle');
  });
});

function setup() {
  const saved = signal<Values | undefined>({ name: 'Original', notes: '' });
  const key = signal('account:facility:first'), canWrite = signal(true);
  const owners = signal<readonly (string | undefined)[]>([]), changes = new Subject<EditSaveMode>();
  const unregister = vi.fn();
  let draft: Values = { name: '', notes: '' };
  const persist = vi.fn(async (value: Values, _base: Values, _ownerId: string) => {
    saved.set(structuredClone(value)); return structuredClone(value);
  });
  const hydrate = vi.fn((value: Values | undefined) => { draft = structuredClone(value ?? { name: '', notes: '' }); });
  const setEnabled = vi.fn();
  const adapter: SettingsEditAdapter<Values> = {
    key, saved, canWrite, pendingOwners: owners, changes,
    read: () => draft, hydrate,
    normalize: value => ({ ...value, name: value.name.trim() }), valid: value => !!value.name.trim(),
    reconcile: (b, l, s, choices) => reconcileFields(b, l, s, { choices }), persist, setEnabled
  };
  TestBed.configureTestingModule({ imports: [SettingsEditHost], providers: [{ provide: SESSION_ADAPTER, useValue: adapter }] });
  const unsavedChanges = TestBed.inject(UnsavedChangesService);
  const registerDraft = unsavedChanges.register.bind(unsavedChanges);
  const register = vi.spyOn(unsavedChanges, 'register').mockImplementation((...args) => {
    const cleanup = registerDraft(...args);
    return () => { unregister(); cleanup(); };
  });
  const fixture = TestBed.createComponent(SettingsEditHost); fixture.detectChanges();
  const session = fixture.componentInstance.session;
  return { session, saved, key, canWrite, owners, changes, persist, hydrate, setEnabled, register, unregister,
    destroy: () => fixture.destroy(),
    get draft() { return draft; },
    edit(value: Partial<Values>, mode: EditSaveMode = 'debounced') { draft = { ...draft, ...value }; changes.next(mode); }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
