import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { VisualizationCommandOutcome, VisualizationConflictError, UpdateVisualizationCommand } from '@data/account-workspace/visualization-commands.models';
import { IdbSavedVisualization, getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition, createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { VisualizationEditorSession } from './visualization-editor-session.service';

describe('VisualizationEditorSession', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('hydrates silently and preserves normalized-equivalent raw metadata without saving', async () => {
    vi.useFakeTimers(); const test = setup();
    test.session.form.controls.name.setValue('  Original  ');
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.submit).not.toHaveBeenCalled();
    expect(test.session.form.controls.name.value).toBe('  Original  ');
    expect(test.session.dirty()).toBe(false);
    expect(test.navigation.register.mock.calls[0]).toHaveLength(3);
  });

  it('saves coherent incomplete setup definitions after 650 ms and omits an empty display title', async () => {
    vi.useFakeTimers(); const test = setup();
    test.session.form.controls.name.setValue(' New name ');
    await vi.advanceTimersByTimeAsync(649); expect(test.submit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(test.submit).toHaveBeenCalledTimes(1);
    expect(test.submit.mock.calls[0][0].definition.name).toBe('New name');
    expect(test.submit.mock.calls[0][0].definition.appearance).toEqual({ legend: true });
    expect(test.session.form.controls.name.value).toBe(' New name ');
    expect(test.session.state()).toBe('saved'); expect(test.session.needsProtection()).toBe(false);
  });

  it('keeps invalid input local and retains rejected edits for explicit retry', async () => {
    vi.useFakeTimers(); const test = setup();
    test.session.form.controls.name.setValue('   ');
    await vi.advanceTimersByTimeAsync(1000);
    expect(test.submit).not.toHaveBeenCalled(); expect(test.session.state()).toBe('invalid');
    expect(await test.session.flush()).toBe(false);
    test.submit.mockImplementationOnce(async command => ({ state: 'failed', command, error: new Error('Save rejected') }));
    test.session.form.controls.name.setValue('Retain me'); await vi.advanceTimersByTimeAsync(650);
    expect(test.session.state()).toBe('error'); expect(test.session.form.controls.name.value).toBe('Retain me');
    await vi.advanceTimersByTimeAsync(5000); expect(test.submit).toHaveBeenCalledTimes(1);
    expect(await test.session.retry()).toBe(true);
    expect(test.submit).toHaveBeenCalledTimes(2); expect(test.session.state()).toBe('saved');
  });

  it('serializes writes and acknowledges only the submitted baseline while preserving newer input and debounce', async () => {
    vi.useFakeTimers(); const test = setup(), pending = deferred<VisualizationCommandOutcome>();
    test.submit.mockImplementationOnce(() => pending.promise);
    test.session.form.controls.name.setValue('First'); await vi.advanceTimersByTimeAsync(650);
    const first = test.submit.mock.calls[0][0];
    test.session.form.controls.name.setValue('  Second  ');
    await vi.advanceTimersByTimeAsync(100);
    pending.resolve(committed(first, 2)); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.form.controls.name.value).toBe('  Second  '); expect(test.session.dirty()).toBe(true);
    await vi.advanceTimersByTimeAsync(549); expect(test.submit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(test.submit).toHaveBeenCalledTimes(2);
    expect(test.submit.mock.calls[1][0].expectedRevision).toBe(2);
    expect(test.submit.mock.calls[1][0].definition.name).toBe('Second');
    expect(test.session.state()).toBe('saved');
  });

  it('saves a reversion made while an earlier write is running', async () => {
    vi.useFakeTimers(); const test = setup(), pending = deferred<VisualizationCommandOutcome>();
    test.submit.mockImplementationOnce(() => pending.promise);
    test.session.form.controls.name.setValue('First'); await vi.advanceTimersByTimeAsync(650);
    test.session.form.controls.name.setValue('Original');
    pending.resolve(committed(test.submit.mock.calls[0][0], 2)); await vi.advanceTimersByTimeAsync(650);
    expect(test.submit).toHaveBeenCalledTimes(2);
    expect(test.submit.mock.calls[1][0].definition.name).toBe('Original');
  });

  it('retains mixed-sourceKind Scatter setup through autosave acknowledgements and newer metadata input', async () => {
    vi.useFakeTimers();
    const definition = createVisualizationSetupDefinition({ name: 'Original', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
      chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor', 'analysis'] });
    const test = setup(record(definition)), pending = deferred<VisualizationCommandOutcome>();
    test.submit.mockImplementationOnce(() => pending.promise);
    test.session.form.controls.name.setValue('First edit'); await vi.advanceTimersByTimeAsync(650);
    const first = test.submit.mock.calls[0][0];
    test.session.form.patchValue({ name: ' Newer edit ', title: 'Usage and predictors', legend: false });
    pending.resolve(committed(first, 2)); await vi.advanceTimersByTimeAsync(0);
    expect(test.session.form.controls.name.value).toBe(' Newer edit ');
    expect(test.session.needsProtection()).toBe(true);
    await vi.advanceTimersByTimeAsync(650);
    expect(test.submit).toHaveBeenCalledTimes(2);
    for (const [command] of test.submit.mock.calls) {
      expect(command.definition.sources).toEqual(definition.sources);
      expect(command.definition.chart).toEqual({ kind: 'scatter', showFit: false });
      expect(command.definition.series).toEqual([]);
      expect(command.definition.period).toEqual(definition.period);
    }
    expect(test.submit.mock.calls[1][0]).toMatchObject({ expectedRevision: 2,
      definition: { name: 'Newer edit', appearance: { title: 'Usage and predictors', legend: false } } });
    expect(test.session.needsProtection()).toBe(false);
  });

  it('retains incomplete mixed-source chart intent when an invalid metadata draft blocks navigation', async () => {
    const definition = createVisualizationSetupDefinition({ name: 'Original', accountGuid: 'account-a', facilitySelection: { kind: 'all' },
      chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] });
    const test = setup(record(definition));
    test.session.form.controls.name.setValue('');
    expect(await test.session.flush()).toBe(false);
    expect(test.session.needsProtection()).toBe(true);
    expect(test.session.definition()).toMatchObject({ sources: definition.sources, chart: definition.chart, series: [] });
    expect(test.submit).not.toHaveBeenCalled();
    test.session.discard();
    expect(test.session.definition()).toEqual(definition);
  });

  it('flushes all newer coherent edits before authorizing navigation', async () => {
    const test = setup(), pending = deferred<VisualizationCommandOutcome>();
    test.submit.mockImplementationOnce(() => pending.promise);
    test.session.form.controls.name.setValue('First'); const flushed = test.session.flush();
    test.session.form.controls.legend.setValue(false);
    pending.resolve(committed(test.submit.mock.calls[0][0], 2));
    expect(await flushed).toBe(true);
    expect(test.submit).toHaveBeenCalledTimes(2); expect(test.session.dirty()).toBe(false);
    expect(test.submit.mock.calls[1][0].definition.appearance.legend).toBe(false);
  });

  it('reconciles independent metadata edits and asks only for genuine conflicts', () => {
    const test = setup();
    test.session.form.controls.name.setValue('Mine'); test.session.form.controls.legend.setValue(false);
    test.publish(record({ ...test.definition, name: 'Theirs', appearance: { legend: true, title: 'External title' } }, 2));
    expect(test.session.form.getRawValue()).toEqual({ name: 'Mine', title: 'External title', legend: false });
    expect(test.session.conflicts().map(conflict => conflict.id)).toEqual(['name']);
    test.session.resolveConflicts({ name: 'saved' });
    expect(test.session.form.controls.name.value).toBe('Theirs');
    expect(test.session.form.controls.legend.value).toBe(false); expect(test.session.conflicts()).toEqual([]);
  });

  it('keeps a command conflict snapshot authoritative over the same stale publication and discard', async () => {
    const test = setup(), saved = record({ ...test.definition, name: 'External' }, 4);
    test.submit.mockImplementationOnce(async command => ({ state: 'conflict', command, current: saved, error: new VisualizationConflictError(saved) }));
    test.session.form.controls.name.setValue('Mine'); expect(await test.session.flush()).toBe(false);
    test.session.hydrate(test.original);
    expect(test.session.savedRevision()).toBe(4); expect(test.session.conflicts().map(value => value.id)).toEqual(['name']);
    test.session.discard(); expect(test.session.form.controls.name.value).toBe('External'); expect(test.session.dirty()).toBe(false);
  });

  it('protects externally deleted local intent without resurrecting the deleted identity', async () => {
    const test = setup(); test.session.form.controls.name.setValue('Recover this');
    test.submit.mockImplementationOnce(async command => ({ state: 'conflict', command, current: undefined, error: new VisualizationConflictError(undefined) }));
    expect(await test.session.flush()).toBe(false);
    test.session.hydrate(test.original);
    expect(test.session.isMissing()).toBe(true); expect(test.session.definition()?.name).toBe('Recover this');
    expect(test.session.needsProtection()).toBe(true);
    expect(await test.session.retry()).toBe(false); expect(test.submit).toHaveBeenCalledTimes(1);
    test.session.discard(); expect(test.session.definition()).toBeUndefined(); expect(test.session.needsProtection()).toBe(false);
  });

  it('recovers committed publication without replay and then saves later input against the recovered revision', async () => {
    const test = setup();
    test.submit.mockImplementationOnce(async command => ({ state: 'refresh-required', command, error: new Error('Refresh failed') }));
    test.session.form.controls.name.setValue('Committed'); expect(await test.session.flush()).toBe(false);
    const submitted = test.submit.mock.calls[0][0];
    expect(test.session.state()).toBe('refresh-required'); expect(test.session.needsProtection()).toBe(true);
    test.session.discard(); expect(test.session.needsProtection()).toBe(true);
    // Retained local values can arrive from changes made while the save was still in flight.
    const restored = record(submitted.definition, 2);
    test.recover.mockResolvedValueOnce(readSavedVisualization(restored));
    expect(await test.session.retry()).toBe(true);
    expect(test.recover).toHaveBeenCalledWith('account-a', 'visualization-a');
    expect(test.submit).toHaveBeenCalledTimes(1); expect(test.session.state()).toBe('saved');
  });

  it('retains later input through publication recovery without replaying the committed mutation', async () => {
    const test = setup(), pending = deferred<VisualizationCommandOutcome>();
    test.submit.mockImplementationOnce(() => pending.promise);
    test.session.form.controls.name.setValue('Committed'); const flushed = test.session.flush();
    const command = test.submit.mock.calls[0][0]; test.session.form.controls.name.setValue('Newer draft');
    pending.resolve({ state: 'refresh-required', command, error: new Error('Refresh failed') }); expect(await flushed).toBe(false);
    test.recover.mockResolvedValueOnce(readSavedVisualization(record(command.definition, 2)));
    expect(await test.session.retry()).toBe(true);
    expect(test.submit).toHaveBeenCalledTimes(2);
    expect(test.submit.mock.calls[1][0].expectedRevision).toBe(2);
    expect(test.submit.mock.calls[1][0].definition.name).toBe('Newer draft');
  });

  it('keeps failed publication recovery protected and never retries persistence', async () => {
    const test = setup();
    test.submit.mockImplementationOnce(async command => ({ state: 'refresh-required', command, error: new Error('Refresh failed') }));
    test.session.form.controls.name.setValue('Committed'); await test.session.flush();
    test.recover.mockRejectedValueOnce(new Error('Still unavailable'));
    expect(await test.session.retry()).toBe(false);
    expect(test.submit).toHaveBeenCalledTimes(1); expect(test.session.state()).toBe('refresh-required');
    expect(test.session.needsProtection()).toBe(true);
  });

  it('keeps unknown payloads read-only, but permits explicit reviewed repair of a readable locked payload', async () => {
    const unknown = record(); unknown.definition = { version: 999 };
    const test = setup(unknown);
    expect(test.session.state()).toBe('readonly'); expect(test.session.definition()).toBeUndefined(); expect(test.session.canEdit()).toBe(false);
    const locked = record(test.definition, 2); locked.preservation = { locked: true, references: [], transfers: [] };
    test.publish(locked);
    expect(test.session.definition()?.name).toBe('Original'); expect(test.session.canEdit()).toBe(false);
    test.session.applyDefinition(test.definition, { acknowledgeTransfer: true, referencePaths: [] });
    expect(await test.session.flush()).toBe(true);
    expect(test.submit.mock.calls[0][0].repair).toEqual({ acknowledgeTransfer: true, referencePaths: [] });
  });

  it('allows a reviewed facility repair while keeping ordinary transferred edits disabled', () => {
    const transferred = record(createVisualizationDefinition('Original', 'account-a', { kind: 'fixed', facilityGuids: ['facility-a', 'missing'] }, 'utility'));
    transferred.preservation = { references: [{ kind: 'facility', guid: 'missing', path: 'facilitySelection.facilityGuids.1', reason: 'not-transferred' }], transfers: [] };
    const test = setup(transferred);
    expect(test.session.canEdit()).toBe(false); expect(test.session.form.disabled).toBe(true);
    expect(test.session.canRetarget()).toBe(true); expect(test.submit).not.toHaveBeenCalled();
    test.publish({ ...transferred, revision: 2, preservation: { ...transferred.preservation, locked: true } });
    expect(test.session.canRetarget()).toBe(false);
    test.account.set({ guid: 'account-b' }); TestBed.tick();
    expect(test.session.canRetarget()).toBe(false);
  });

  it('does not switch identities with a protected draft or save into another account', async () => {
    const test = setup(); test.session.form.controls.name.setValue('Keep me');
    test.session.open('account-b', 'visualization-b');
    expect(test.session.key()).toBe(JSON.stringify(['account-a', 'visualization-a']));
    test.account.set({ guid: 'account-b' }); TestBed.tick();
    expect(test.session.canEdit()).toBe(false); expect(await test.session.flush()).toBe(false);
    expect(test.submit).not.toHaveBeenCalled(); expect(test.session.definition()?.name).toBe('Keep me');
  });

  it('waits for an unrelated pending command and resumes the scheduled save after its publication', async () => {
    vi.useFakeTimers(); const test = setup();
    test.hasPending.set(true); test.session.form.controls.name.setValue('Wait for workspace');
    await vi.advanceTimersByTimeAsync(1000); expect(test.submit).not.toHaveBeenCalled();
    test.hasPending.set(false); TestBed.tick(); await vi.advanceTimersByTimeAsync(0);
    expect(test.submit).toHaveBeenCalledTimes(1);
  });
});

function record(definition = createVisualizationDefinition('Original', 'account-a', { kind: 'all' }, 'utility'), revision = 1): IdbSavedVisualization {
  return { ...getNewIdbSavedVisualization(definition), guid: 'visualization-a', revision, id: 1 };
}
function committed(command: UpdateVisualizationCommand, revision = command.expectedRevision + 1): VisualizationCommandOutcome {
  return { state: 'committed', command, value: record(command.definition, revision), referenceIssues: [] };
}
function setup(original = record()) {
  const definition = createVisualizationDefinition('Original', 'account-a', { kind: 'all' }, 'utility');
  const account = signal({ guid: 'account-a' }), records = signal<readonly IdbSavedVisualization[]>([original]);
  const hasPending = signal(false), snapshot = signal<unknown>({ revision: 1 }), ready = signal(true);
  const submit = vi.fn<(command: UpdateVisualizationCommand) => Promise<VisualizationCommandOutcome>>().mockImplementation(async command => committed(command));
  const recover = vi.fn();
  const navigation = { register: vi.fn(() => vi.fn()), protectBeforeUnload: vi.fn(() => vi.fn()) };
  TestBed.configureTestingModule({ providers: [VisualizationEditorSession,
    { provide: AccountWorkspaceStore, useValue: { isReady: ready, account, savedVisualizations: records, snapshot, hasPending } },
    { provide: SavedVisualizationCommands, useValue: { submit, recover } },
    { provide: UnsavedChangesService, useValue: navigation }
  ] });
  const session = TestBed.inject(VisualizationEditorSession); session.open('account-a', 'visualization-a'); TestBed.tick();
  return { session, definition, original, submit, recover, navigation, account, hasPending,
    publish: (value: IdbSavedVisualization | undefined) => { records.set(value ? [value] : []); snapshot.set({}); TestBed.tick(); } };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(callback => { resolve = callback; }); return { promise, resolve }; }
