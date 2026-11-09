import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { AnalysisAutosave } from './analysis-autosave';

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>(finish => { resolve = finish; });
  return { promise, resolve: (value: T) => resolve(value) };
}

describe('legacy analysis autosave draft lifetime', () => {
  afterEach(() => vi.useRealTimers());

  it('does not write on hydration or unchanged input and saves the latest typing after 300ms', async () => {
    vi.useFakeTimers();
    const persist = vi.fn(async () => undefined);
    const editor = new AnalysisAutosave(persist);
    editor.hydrate({ text: 'original' }, true);
    await editor.capture({ text: 'original' }, true);
    await vi.advanceTimersByTimeAsync(300);
    expect(persist).not.toHaveBeenCalled();
    await editor.capture({ text: 'a' }, true);
    await vi.advanceTimersByTimeAsync(200);
    await editor.capture({ text: 'ab' }, true);
    await vi.advanceTimersByTimeAsync(299);
    expect(persist).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(persist).toHaveBeenCalledExactlyOnceWith({ text: 'ab' }, { text: 'original' });
    expect(editor.dirty()).toBe(false);
    editor.destroy();
  });

  it('runs one write at a time and coalesces newer edits to the latest draft', async () => {
    const first = deferred<void>();
    const persist = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    const editor = new AnalysisAutosave(persist);
    editor.hydrate({ text: 'original' }, true);
    const saving = editor.capture({ text: 'first' }, true, true);
    await editor.capture({ text: 'second' }, true);
    const latest = editor.capture({ text: 'latest' }, true, true);
    expect(persist).toHaveBeenCalledTimes(1);
    first.resolve();
    await Promise.all([saving, latest]);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenLastCalledWith({ text: 'latest' }, { text: 'first' });
    expect(editor.dirty()).toBe(false);
    editor.destroy();
  });

  it('persists a reversion to the original value after an older save commits', async () => {
    const first = deferred<void>();
    const persist = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    const editor = new AnalysisAutosave(persist);
    editor.hydrate({ amount: 10 }, true);
    const saving = editor.capture({ amount: 11 }, true, true);
    await editor.capture({ amount: 10 }, true);
    const leaving = editor.canDeactivate(new RouterGuardService(), vi.fn());
    first.resolve();
    await Promise.all([saving, leaving]);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist).toHaveBeenLastCalledWith({ amount: 10 }, { amount: 11 });
    expect(editor.value).toEqual({ amount: 10 });
    expect(editor.dirty()).toBe(false);
    editor.destroy();
  });

  it('retains a newer invalid draft when an older valid save finishes', async () => {
    const first = deferred<void>();
    const persist = vi.fn(() => first.promise);
    const editor = new AnalysisAutosave(persist);
    editor.hydrate({ amount: 1 }, true);
    const saving = editor.capture({ amount: 12 }, true, true);
    await editor.capture({ amount: null }, false);
    first.resolve();
    expect(await saving).toBe(false);
    expect(editor.value).toEqual({ amount: null });
    expect(editor.dirty()).toBe(true);
    expect(editor.saving()).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
    editor.destroy();
  });

  it('waits for the active durable write and discards only the remaining local changes', async () => {
    const first = deferred<void>();
    const persist = vi.fn(() => first.promise);
    const editor = new AnalysisAutosave(persist);
    editor.hydrate({ text: 'original' }, true);
    const saving = editor.capture({ text: 'saved first' }, true, true);
    await editor.capture({ text: 'unsaved second' }, true);
    const discarding = editor.discard();
    expect(editor.saving()).toBe(true);
    first.resolve();
    await Promise.all([saving, discarding]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(editor.value).toEqual({ text: 'saved first' });
    expect(editor.dirty()).toBe(false);
    editor.destroy();
  });

  it('flushes the final valid edit before a normal exit', async () => {
    const persist = vi.fn(async () => undefined);
    const editor = new AnalysisAutosave(persist);
    const guard = new RouterGuardService();
    editor.hydrate({ text: 'original' }, true);
    await editor.capture({ text: 'final' }, true);
    expect(await editor.canDeactivate(guard, vi.fn())).toBe(true);
    expect(persist).toHaveBeenCalledExactlyOnceWith({ text: 'final' }, { text: 'original' });
    expect(guard.showModal.value).toBe(false);
    editor.destroy();
  });

  it('offers discard/cancel for an invalid draft and coalesces simultaneous exit requests', async () => {
    const persist = vi.fn(async () => undefined);
    const editor = new AnalysisAutosave(persist);
    const guard = new RouterGuardService();
    const restore = vi.fn();
    editor.hydrate({ text: 'original' }, true);
    await editor.capture({ text: '' }, false);
    const leaving = editor.canDeactivate(guard, restore);
    expect(editor.canDeactivate(guard, restore)).toBe(leaving);
    await Promise.resolve();
    expect(guard.showModal.value).toBe(true);
    expect(guard.showSave.value).toBe(false);
    guard.setModalAction('discard');
    expect(await leaving).toBe(true);
    expect(restore).toHaveBeenCalledWith({ text: 'original' });
    expect(persist).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('ignores a departing owner failure and still saves a new owner draft', async () => {
    let failOld: (reason: Error) => void;
    const oldFlight = new Promise<void>((_resolve, reject) => { failOld = reject; });
    const persist = vi.fn().mockReturnValueOnce(oldFlight).mockResolvedValue(undefined);
    const editor = new AnalysisAutosave(persist);
    editor.hydrate({ owner: 'account-a', text: 'original' }, true);
    const oldSaving = editor.capture({ owner: 'account-a', text: 'old edit' }, true, true);
    editor.hydrate({ owner: 'account-b', text: 'new original' }, true);
    const newSaving = editor.capture({ owner: 'account-b', text: 'new edit' }, true, true);
    failOld(new Error('stale account'));
    expect(await oldSaving).toBe(false);
    expect(await newSaving).toBe(true);
    expect(editor.error()).toBeUndefined();
    expect(editor.dirty()).toBe(false);
    expect(persist).toHaveBeenLastCalledWith({ owner: 'account-b', text: 'new edit' }, { owner: 'account-b', text: 'new original' });
    editor.destroy();
  });

  it('retains failed changes, warns on exit, and lets Save retry the same draft', async () => {
    const persist = vi.fn().mockRejectedValueOnce(new Error('disk unavailable')).mockResolvedValue(undefined);
    const editor = new AnalysisAutosave(persist);
    const guard = new RouterGuardService();
    editor.hydrate({ text: 'original' }, true);
    expect(await editor.capture({ text: 'edited' }, true, true)).toBe(false);
    expect(editor.error()).toContain('could not be saved');
    const leaving = editor.canDeactivate(guard, vi.fn());
    expect(guard.showModal.value).toBe(true);
    expect(guard.showSave.value).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    guard.setModalAction('save');
    expect(await leaving).toBe(true);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(editor.error()).toBeUndefined();
    editor.destroy();
  });
  it('does not discard the new owner draft in response to an old owner leave dialog', async () => {
    const persist = vi.fn(async () => undefined);
    const editor = new AnalysisAutosave(persist);
    const guard = new RouterGuardService();
    const restore = vi.fn();
    try {
      editor.hydrate({ owner: 'a', text: 'original-a' }, true);
      await editor.capture({ owner: 'a', text: '' }, false);
      const leaving = editor.canDeactivate(guard, restore);
      await Promise.resolve();
      expect(guard.showModal.value).toBe(true);
      editor.hydrate({ owner: 'b', text: 'original-b' }, true);
      await editor.capture({ owner: 'b', text: 'new-b' }, true);
      guard.setModalAction('discard');
      expect(await leaving).toBe(false);
      expect(editor.value).toEqual({ owner: 'b', text: 'new-b' });
      expect(restore).not.toHaveBeenCalled();
    } finally { editor.destroy(); }
  });

});
