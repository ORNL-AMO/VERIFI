import { Component, InjectionToken, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
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

  it.each(['Original', 'Submitted'])('verifies a committed write with a failed reload before acknowledging the later draft %s', async laterName => {
    vi.useFakeTimers(); const test = setup(); const pending = deferred<Values>();
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(value => { durable.commit(value); return pending.promise; });
    test.edit({ name: 'Submitted' }, 'immediate');
    if (laterName !== 'Submitted') test.edit({ name: laterName });
    pending.reject(new WorkspaceWriteError('persistence-failed', 'Workspace reload failed after persistence.', undefined, true));
    await vi.advanceTimersByTimeAsync(0);

    expect(test.saved()).toEqual({ name: 'Original', notes: '' });
    expect(durable.read()).toEqual({ name: 'Submitted', notes: '' });
    expect(test.draft).toEqual({ name: laterName, notes: '' });
    expect(test.session.state()).toBe('error'); expect(test.session.dirty()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.persist).toHaveBeenCalledOnce();

    test.session.retry(); await vi.advanceTimersByTimeAsync(0);

    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1].slice(0, 2)).toEqual([
      { name: laterName, notes: '' }, { name: 'Submitted', notes: '' }
    ]);
    expect(durable.read()).toEqual({ name: laterName, notes: '' });
    expect(test.draft).toEqual(durable.read());
    expect(test.session.dirty()).toBe(false); expect(test.session.state()).toBe('saved');
  });

  it('preserves a reversion after a failed committed reload when an independent field published during the save', async () => {
    vi.useFakeTimers(); const test = setup(); const pending = deferred<Values>();
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(value => {
      durable.commit({ ...value, notes: 'Remote note' });
      return pending.promise;
    });
    test.edit({ name: 'Submitted' }, 'immediate');
    test.saved.set({ name: 'Original', notes: 'Remote note' }); TestBed.tick();
    test.edit({ name: 'Original' });
    pending.reject(new WorkspaceWriteError('persistence-failed', 'Workspace reload failed.', undefined, true));
    await vi.advanceTimersByTimeAsync(0);

    expect(test.saved()).toEqual({ name: 'Original', notes: 'Remote note' });
    expect(durable.read()).toEqual({ name: 'Submitted', notes: 'Remote note' });
    expect(test.draft.name).toBe('Original');
    expect(test.session.state()).toBe('error'); expect(test.session.dirty()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000); expect(test.persist).toHaveBeenCalledOnce();

    test.session.retry(); await vi.advanceTimersByTimeAsync(0);

    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1][1]).toEqual({ name: 'Submitted', notes: '' });
    expect(durable.read()).toEqual({ name: 'Original', notes: 'Remote note' });
    expect(test.draft).toEqual(durable.read());
    expect(test.session.state()).toBe('saved'); expect(test.session.dirty()).toBe(false);
  });

  it('discards to the submitted committed value until a genuinely new saved publication replaces it', async () => {
    vi.useFakeTimers(); const test = setup(); const pending = deferred<Values>();
    const original = test.saved()!;
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(value => { durable.commit(value); return pending.promise; });
    test.edit({ name: 'Submitted' }, 'immediate'); test.edit({ name: 'Original' });
    pending.reject(new WorkspaceWriteError('persistence-failed', 'Workspace reload failed.', undefined, true));
    await vi.advanceTimersByTimeAsync(0);
    expect(test.session.dirty()).toBe(true);

    test.session.discard();

    expect(test.draft).toEqual({ name: 'Submitted', notes: '' });
    expect(test.session.dirty()).toBe(false); expect(test.session.error()).toBeUndefined();
    expect(test.saved()).toEqual(original);
    test.owners.set(['another-editor']); TestBed.tick();
    test.owners.set([]); TestBed.tick();
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.draft).toEqual({ name: 'Submitted', notes: '' });
    expect(test.session.dirty()).toBe(false); expect(test.persist).toHaveBeenCalledOnce();

    durable.commit(original); test.saved.set({ ...original }); TestBed.tick();

    expect(test.draft).toEqual(original); expect(test.session.dirty()).toBe(false);
    expect(test.persist).toHaveBeenCalledOnce();
  });

  it('retains an earlier committed-write uncertainty when a retry fails before persistence', async () => {
    vi.useFakeTimers(); const test = setup(); const pending = deferred<Values>();
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(value => { durable.commit(value); return pending.promise; });
    test.edit({ name: 'Submitted' }, 'immediate'); test.edit({ name: 'Original' });
    pending.reject(new WorkspaceWriteError('persistence-failed', 'Workspace reload failed.', undefined, true));
    await vi.advanceTimersByTimeAsync(0);
    test.persist.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Retry failed before writing.'));

    test.session.retry(); await vi.advanceTimersByTimeAsync(0);

    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.session.state()).toBe('error'); expect(test.session.dirty()).toBe(true);
    expect(test.draft).toEqual({ name: 'Original', notes: '' });
    expect(durable.read()).toEqual({ name: 'Submitted', notes: '' });
    await vi.advanceTimersByTimeAsync(1000); expect(test.persist).toHaveBeenCalledTimes(2);

    test.session.retry(); await vi.advanceTimersByTimeAsync(0);

    expect(test.persist).toHaveBeenCalledTimes(3);
    expect(test.persist.mock.calls[2].slice(0, 2)).toEqual([
      { name: 'Original', notes: '' }, { name: 'Submitted', notes: '' }
    ]);
    expect(durable.read()).toEqual({ name: 'Original', notes: '' });
    expect(test.session.dirty()).toBe(false);
  });

  it('retries a true pre-persistence failure against the original saved baseline', async () => {
    vi.useFakeTimers(); const test = setup();
    const durable = useDurablePersistence(test);
    test.persist.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'No records were written.'));
    test.edit({ name: 'Submitted' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);

    expect(durable.read()).toEqual({ name: 'Original', notes: '' });
    expect(test.draft).toEqual({ name: 'Submitted', notes: '' });
    expect(test.session.state()).toBe('error'); expect(test.session.dirty()).toBe(true);
    test.session.retry(); await vi.advanceTimersByTimeAsync(0);

    expect(test.persist.mock.calls[1].slice(0, 2)).toEqual([
      { name: 'Submitted', notes: '' }, { name: 'Original', notes: '' }
    ]);
    expect(durable.read()).toEqual({ name: 'Submitted', notes: '' });
    expect(test.session.dirty()).toBe(false);
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

  it('hydrates a field reverted to its original value while another field remains conflicted', async () => {
    vi.useFakeTimers(); const test = setup();
    test.edit({ name: 'Mine', notes: 'My note' });
    test.saved.set({ name: 'Theirs', notes: 'Their note' }); TestBed.tick();
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name', 'notes']);

    test.edit({ name: 'Original' });

    expect(test.draft).toEqual({ name: 'Theirs', notes: 'My note' });
    expect(test.session.conflicts()).toEqual([expect.objectContaining({ id: 'notes', localValue: 'My note' })]);
    test.session.resolveConflicts({ notes: 'local' }); await vi.advanceTimersByTimeAsync(0);
    expect(test.persist).toHaveBeenCalledExactlyOnceWith({ name: 'Theirs', notes: 'My note' },
      { name: 'Theirs', notes: 'Their note' }, expect.any(String));
  });

  it.each(['local', 'saved', 'discard'] as const)('retains an execution-time saved snapshot through unrelated-owner effects before %s', async choice => {
    vi.useFakeTimers(); const test = setup();
    const actualSaved = { name: 'Theirs', notes: '' };
    useDurablePersistence(test, actualSaved);
    test.persist.mockRejectedValueOnce({ cause: new EditorConflictError(actualSaved) });
    test.edit({ name: 'Mine' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    const expectedConflict = expect.objectContaining({ id: 'name', localValue: 'Mine', savedValue: 'Theirs' });
    expect(test.saved()).toEqual({ name: 'Original', notes: '' });
    expect(test.session.conflicts()).toEqual([expectedConflict]);

    test.owners.set(['another-editor']); TestBed.tick();
    expect(test.session.canEdit()).toBe(false);
    expect(test.session.conflicts()).toEqual([expectedConflict]);
    test.owners.set([]); TestBed.tick();
    expect(test.session.canEdit()).toBe(true);
    expect(test.session.conflicts()).toEqual([expectedConflict]);
    expect(test.draft.name).toBe('Mine');
    await vi.advanceTimersByTimeAsync(1000); expect(test.persist).toHaveBeenCalledOnce();

    if (choice === 'discard') test.session.discard();
    else test.session.resolveConflicts({ name: choice });
    await vi.advanceTimersByTimeAsync(0);

    expect(test.draft).toEqual({ name: choice === 'local' ? 'Mine' : 'Theirs', notes: '' });
    expect(test.session.conflicts()).toEqual([]); expect(test.session.dirty()).toBe(false);
    if (choice === 'local') {
      expect(test.persist).toHaveBeenCalledTimes(2);
      expect(test.persist.mock.calls[1].slice(0, 2)).toEqual([
        { name: 'Mine', notes: '' }, actualSaved
      ]);
    } else expect(test.persist).toHaveBeenCalledOnce();
  });

  it('accepts an actual saved publication with the same old values after an unpublished execution-time conflict', async () => {
    vi.useFakeTimers(); const test = setup();
    const original = test.saved()!;
    const durable = useDurablePersistence(test, { name: 'Theirs', notes: '' });
    test.persist.mockRejectedValueOnce(new EditorConflictError(durable.read()));
    test.edit({ name: 'Mine' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name']);

    durable.commit(original);
    test.saved.set({ ...original }); TestBed.tick(); await vi.advanceTimersByTimeAsync(0);

    expect(test.session.conflicts()).toEqual([]);
    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1].slice(0, 2)).toEqual([{ name: 'Mine', notes: '' }, original]);
    expect(durable.read()).toEqual({ name: 'Mine', notes: '' });
    expect(test.session.dirty()).toBe(false);
  });

  it('resumes autosave when a saved refresh resolves an execution-time conflict but leaves an independent edit', async () => {
    vi.useFakeTimers(); const test = setup();
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(async () => {
      const actualSaved = { name: 'Theirs', notes: '' };
      durable.commit(actualSaved); test.saved.set(actualSaved);
      throw new EditorConflictError(actualSaved);
    });
    test.edit({ name: 'Mine', notes: 'My note' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name']);

    const matchingSaved = { name: 'Mine', notes: '' };
    durable.commit(matchingSaved); test.saved.set(matchingSaved); TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);

    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1][0]).toEqual({ name: 'Mine', notes: 'My note' });
    expect(durable.read()).toEqual({ name: 'Mine', notes: 'My note' });
    expect(test.session.conflicts()).toEqual([]); expect(test.session.dirty()).toBe(false);
  });

  it('keeps a newer edit deadline when a refresh resolves the earlier execution-time conflict', async () => {
    vi.useFakeTimers(); const test = setup(); const first = deferred<Values>();
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(() => first.promise);
    test.edit({ name: 'Mine' }, 'immediate'); await vi.advanceTimersByTimeAsync(100);
    test.edit({ notes: 'My later note' });
    await vi.advanceTimersByTimeAsync(100);
    const conflictingSaved = { name: 'Theirs', notes: '' };
    durable.commit(conflictingSaved); test.saved.set(conflictingSaved); TestBed.tick();
    first.reject(new EditorConflictError(conflictingSaved)); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name']);
    await vi.advanceTimersByTimeAsync(100);
    const matchingSaved = { name: 'Mine', notes: '' };
    durable.commit(matchingSaved); test.saved.set(matchingSaved); TestBed.tick();

    expect(test.session.conflicts()).toEqual([]); expect(test.session.dirty()).toBe(true);
    await vi.advanceTimersByTimeAsync(449); expect(test.persist).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1][0]).toEqual({ name: 'Mine', notes: 'My later note' });
    expect(test.session.dirty()).toBe(false);
  });

  it('keeps the deadline of an edit made while a conflict is already unresolved', async () => {
    vi.useFakeTimers(); const test = setup();
    const durable = useDurablePersistence(test);
    test.persist.mockImplementationOnce(async () => {
      const actualSaved = { name: 'Theirs', notes: '' };
      durable.commit(actualSaved); test.saved.set(actualSaved);
      throw new EditorConflictError(actualSaved);
    });
    test.edit({ name: 'Mine' }, 'immediate'); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name']);
    await vi.advanceTimersByTimeAsync(100);

    test.edit({ notes: 'My later note' });

    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name']);
    await vi.advanceTimersByTimeAsync(200);
    const matchingSaved = { name: 'Mine', notes: '' };
    durable.commit(matchingSaved); test.saved.set(matchingSaved); TestBed.tick();
    expect(test.session.conflicts()).toEqual([]); expect(test.session.dirty()).toBe(true);
    await vi.advanceTimersByTimeAsync(449); expect(test.persist).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);

    expect(test.persist).toHaveBeenCalledTimes(2);
    expect(test.persist.mock.calls[1][0]).toEqual({ name: 'Mine', notes: 'My later note' });
    expect(test.draft).toEqual(durable.read()); expect(test.session.dirty()).toBe(false);
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
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function useDurablePersistence(test: ReturnType<typeof setup>, initial = test.saved()!) {
  let durable = structuredClone(initial);
  test.persist.mockImplementation(async (value, base) => {
    const merged = reconcileFields(base, value, durable);
    if (merged.conflicts.length) throw new EditorConflictError(structuredClone(durable));
    durable = structuredClone(merged.value);
    test.saved.set(structuredClone(durable));
    return structuredClone(durable);
  });
  return {
    read: () => structuredClone(durable),
    commit: (value: Values) => { durable = structuredClone(value); }
  };
}
