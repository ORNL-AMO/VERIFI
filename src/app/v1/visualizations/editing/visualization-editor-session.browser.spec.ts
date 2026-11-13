import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';
import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { VisualizationCommandHandler } from '@data/account-workspace/handlers/visualization-command-handler.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbSavedVisualization, IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition, createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { VisualizationEditorSession } from './visualization-editor-session.service';

describe('visualization editor session with native IndexedDB', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService,
      useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('visualization-editor');
    await harness.seed({ accounts: [account], facilities: [facility] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });

  async function create(definition: VisualizationDefinition = createVisualizationDefinition('Original', account.guid,
    { kind: 'fixed', facilityGuids: [facility.guid] }, 'utility')) {
    const commands = TestBed.inject(SavedVisualizationCommands);
    const proposal = commands.prepareCreate(definition);
    expect((await commands.submit(proposal)).state).toBe('committed');
    const session = TestBed.runInInjectionContext(() => new VisualizationEditorSession());
    session.open(account.guid, proposal.guid); TestBed.tick();
    return { commands, proposal, session };
  }

  function changeFacilities(session: VisualizationEditorSession, selection: VisualizationFacilitySelection): Promise<boolean> {
    const snapshot = TestBed.inject(AccountWorkspaceStore).snapshot()!;
    return session.retarget(selection, prepareVisualizationFacilityChange(session.definition()!, selection, snapshot).definition);
  }

  it.each([
    { label: 'existing single-sourceKind setup', definition: createVisualizationDefinition('Original', account.guid,
      { kind: 'fixed', facilityGuids: [facility.guid] }, 'utility') },
    { label: 'mixed-sourceKind Scatter setup', definition: createVisualizationSetupDefinition({ name: 'Original', accountGuid: account.guid,
      facilitySelection: { kind: 'fixed', facilityGuids: [facility.guid] }, chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] }) }
  ])('saves metadata and rehydrates $label from the durable record after database reopen', async ({ definition }) => {
    const { session, proposal } = await create(definition);
    session.form.patchValue({ name: ' Durable name ', title: 'Current utility use', legend: false });
    expect(await session.flush()).toBe(true);
    const previous = TestBed.inject(AccountWorkspaceStore).snapshot()!;
    await harness.reopen();
    const saved = await harness.getAll<IdbSavedVisualization & { [key: string]: unknown }>('savedVisualizations');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ guid: proposal.guid, revision: 2,
      definition: { name: 'Durable name', appearance: { title: 'Current utility use', legend: false } } });
    expect(saved[0].definition).toEqual({ ...definition, name: 'Durable name', appearance: { title: 'Current utility use', legend: false } });
    const store = TestBed.inject(AccountWorkspaceStore);
    store.publish({ ...previous, savedVisualizations: saved });
    // Reopening destroys all original providers. This fresh editor reads the reopened committed snapshot;
    // no command is necessary until a new user edit, so a missing command registration fails loudly.
    const injector = createEnvironmentInjector([VisualizationEditorSession,
      { provide: SavedVisualizationCommands, useValue: { submit: () => { throw new Error('Unexpected hydration write'); } } }], TestBed.inject(EnvironmentInjector));
    try {
      const reopened = injector.get(VisualizationEditorSession); reopened.open(account.guid, proposal.guid); TestBed.tick();
      expect(reopened.form.getRawValue()).toEqual({ name: 'Durable name', title: 'Current utility use', legend: false });
      expect(reopened.definition()).toEqual(saved[0].definition);
      expect(reopened.state()).toBe('saved'); expect(reopened.needsProtection()).toBe(false);
    } finally { injector.destroy(); }
  });

  it('moves a saved visualization under the same identity and reopens the committed scope', async () => {
    const { session, proposal } = await create();
    const original = session.record()!;
    expect(await changeFacilities(session, { kind: 'all' })).toBe(true);
    expect(session.definition()!.facilitySelection).toEqual({ kind: 'all' });
    expect(session.record()).toMatchObject({ guid: proposal.guid, id: original.id, revision: 2, createdDate: original.createdDate });
    expect(session.record()).not.toHaveProperty('facilityId');
    expect(session.needsProtection()).toBe(false); expect(session.canEdit()).toBe(true);
    await harness.reopen();
    const records = await harness.getAll<IdbSavedVisualization & { [key: string]: unknown }>('savedVisualizations');
    expect(records).toHaveLength(1); expect(records[0]).toMatchObject({ guid: proposal.guid, definition: { facilitySelection: { kind: 'all' } } });
  });

  it('retains a rejected ownership proposal for retry or discard while keeping the current scope visible', async () => {
    const { session } = await create();
    const retarget = vi.spyOn(TestBed.inject(VisualizationCommandHandler), 'retarget').mockRejectedValueOnce(new Error('Scope write rejected'));
    expect(await changeFacilities(session, { kind: 'all' })).toBe(false);
    expect(session.definition()!.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: [facility.guid] });
    expect(session.needsProtection()).toBe(true); expect(session.canEdit()).toBe(false);
    expect(await session.retry()).toBe(true);
    expect(retarget).toHaveBeenCalledTimes(2); expect(session.definition()!.facilitySelection).toEqual({ kind: 'all' });
    retarget.mockRejectedValueOnce(new Error('Scope write rejected'));
    expect(await changeFacilities(session, { kind: 'fixed', facilityGuids: [facility.guid] })).toBe(false);
    session.discard();
    expect(session.definition()!.facilitySelection).toEqual({ kind: 'all' }); expect(session.canEdit()).toBe(true); expect(session.needsProtection()).toBe(false);
  });

  it('keeps an external ownership conflict unresolved when local configuration cannot use ordinary autosave', async () => {
    const definition = createVisualizationSetupDefinition({ name: 'Original', accountGuid: account.guid,
      facilitySelection: { kind: 'fixed', facilityGuids: [facility.guid] }, sourceKinds: ['utility'],
      chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' } });
    const { session, commands, proposal } = await create(definition);
    const update = vi.spyOn(TestBed.inject(VisualizationCommandHandler), 'update');
    session.applyDefinition({ ...session.definition()!, chart: {
      kind: 'time-series', defaultTraceType: 'bar', interval: 'yearly', stack: 'none'
    } });
    session.form.controls.name.setValue('Retained local name');
    const local = structuredClone(session.definition());
    expect((await commands.submit({ kind: 'retarget', accountGuid: account.guid, guid: proposal.guid,
      expectedRevision: 1, targetFacilities: { kind: 'all' },
      reviewedDefinition: prepareVisualizationFacilityChange(definition, { kind: 'all' }, TestBed.inject(AccountWorkspaceStore).snapshot()!).definition })).state).toBe('committed');
    TestBed.tick();
    expect(session.conflicts().map(conflict => conflict.id)).toEqual(['configuration']);
    session.resolveConflicts({ configuration: 'local' });
    expect(session.definition()).toEqual(local);
    expect(session.conflicts().map(conflict => conflict.id)).toEqual(['configuration']);
    expect(session.state()).toBe('conflict'); expect(session.needsProtection()).toBe(true);
    expect(session.error()).toContain('Facility inclusion changed in another session');
    expect(await session.flush()).toBe(false); expect(update).not.toHaveBeenCalled();

    session.resolveConflicts({ configuration: 'saved' });
    expect(session.conflicts()).toEqual([]); expect(session.error()).toBeUndefined();
    expect(session.definition()).toMatchObject({ name: 'Retained local name', facilitySelection: { kind: 'all' },
      chart: { defaultTraceType: 'line', interval: 'monthly' } });
    expect(await session.flush()).toBe(true); expect(update).toHaveBeenCalledOnce();
    const records = await harness.getAll<IdbSavedVisualization & { [key: string]: unknown }>('savedVisualizations');
    expect(records[0]).toMatchObject({ guid: proposal.guid, revision: 3,
      definition: { name: 'Retained local name', facilitySelection: { kind: 'all' } } });
    expect(records[0]).not.toHaveProperty('facilityId'); expect(session.needsProtection()).toBe(false);
  });

  it('recovers committed ownership publication without repeating a retarget', async () => {
    const { session } = await create();
    const retarget = vi.spyOn(TestBed.inject(VisualizationCommandHandler), 'retarget');
    vi.spyOn(TestBed.inject(AccountWorkspaceStore), 'publishCommittedPatch').mockImplementationOnce(() => { throw new Error('Patch unavailable'); });
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    expect(await changeFacilities(session, { kind: 'all' })).toBe(false);
    expect(session.state()).toBe('refresh-required'); expect(session.needsProtection()).toBe(true);
    vi.spyOn(TestBed.inject(SavedVisualizationCommands), 'recover').mockRejectedValueOnce(new Error('Refresh still unavailable'));
    expect(await session.retry()).toBe(false);
    expect(session.error()).toContain('Facility inclusion was saved');
    expect(retarget).toHaveBeenCalledOnce();
    expect(await session.retry()).toBe(true);
    expect(retarget).toHaveBeenCalledOnce(); expect(session.definition()!.facilitySelection).toEqual({ kind: 'all' });
    expect(session.record()).not.toHaveProperty('facilityId'); expect(session.needsProtection()).toBe(false);
  });

  it('recovers committed publication after an editor save without repeating its IndexedDB update', async () => {
    const { session, proposal } = await create();
    const handler = TestBed.inject(VisualizationCommandHandler), update = vi.spyOn(handler, 'update');
    vi.spyOn(TestBed.inject(AccountWorkspaceStore), 'publishCommittedPatch').mockImplementationOnce(() => { throw new Error('Patch unavailable'); });
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    session.form.controls.name.setValue('Committed update');
    expect(await session.flush()).toBe(false);
    expect(session.state()).toBe('refresh-required'); expect(session.needsProtection()).toBe(true);
    expect((await harness.getAll<IdbSavedVisualization & { [key: string]: unknown }>('savedVisualizations'))[0])
      .toMatchObject({ guid: proposal.guid, revision: 2, definition: { name: 'Committed update' } });
    expect(await session.retry()).toBe(true);
    expect(update).toHaveBeenCalledTimes(1); expect(session.savedRevision()).toBe(2);
    expect(session.needsProtection()).toBe(false);
  });

  it('recovers a committed facility repair without replay while unrelated imported references remain protected', async () => {
    const base = createVisualizationDefinition('Transferred chart', account.guid,
      { kind: 'fixed', facilityGuids: [facility.guid, 'missing-facility'] }, 'predictor');
    const definition: VisualizationDefinition = { ...base, sources: base.sources.map(source => source.kind === 'predictor'
      ? { ...source, selection: { kind: 'fixed', resource: 'predictor', guids: ['missing-predictor'] } } : source) };
    const original = { ...getNewIdbSavedVisualization(definition), id: 1, preservation: { transfers: [], references: [
      { kind: 'facility' as const, guid: 'missing-facility', path: 'facilitySelection.facilityGuids.1', reason: 'not-transferred' as const },
      { kind: 'predictor' as const, guid: 'missing-predictor', path: 'sources.0.selection.guids.0', reason: 'not-transferred' as const }
    ] } };
    await harness.seed({ savedVisualizations: [original] });
    const store = TestBed.inject(AccountWorkspaceStore);
    store.publish({ ...store.snapshot()!, savedVisualizations: [original] });
    const session = TestBed.runInInjectionContext(() => new VisualizationEditorSession());
    session.open(account.guid, original.guid); TestBed.tick();
    expect(session.canEdit()).toBe(false); expect(session.canRetarget()).toBe(true);
    const retarget = vi.spyOn(TestBed.inject(VisualizationCommandHandler), 'retarget');
    vi.spyOn(store, 'publishCommittedPatch').mockImplementationOnce(() => { throw new Error('Patch unavailable'); });
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    expect(await changeFacilities(session, { kind: 'fixed', facilityGuids: [facility.guid] })).toBe(false);
    expect(session.state()).toBe('refresh-required');
    expect(await session.retry()).toBe(true);
    expect(retarget).toHaveBeenCalledOnce(); expect(session.savedRevision()).toBe(2);
    expect(session.record()!.preservation!.references).toEqual([original.preservation.references[1]]);
    expect(session.state()).toBe('readonly'); expect(session.canEdit()).toBe(false);
    expect(session.needsProtection()).toBe(false);
  });

  it('keeps the workspace ready through autosave and publishes only the committed visualization', async () => {
    const { session, proposal } = await create();
    const store = TestBed.inject(AccountWorkspaceStore);
    const before = store.snapshot()!, selections = store.selections(), revision = store.committedRevision();
    const loading = vi.spyOn(store, 'beginLoad');
    const reload = vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace');
    session.form.controls.name.setValue('Inline autosave');
    expect(await session.flush()).toBe(true);
    expect(loading).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled();
    expect(store.isReady()).toBe(true); expect(store.selections()).toEqual(selections);
    expect(store.committedRevision()!.revision).toBeGreaterThan(revision!.revision);
    const { savedVisualizations: priorVisualizations, ...priorCollections } = before;
    const { savedVisualizations, ...collections } = store.snapshot()!;
    expect(collections).toEqual(priorCollections);
    expect(savedVisualizations).toEqual([expect.objectContaining({ guid: proposal.guid, revision: 2, definition: expect.objectContaining({ name: 'Inline autosave' }) })]);
    expect(priorVisualizations[0].revision).toBe(1);
  });

  it('retains missing-source intent and an externally deleted draft without writing a replacement', async () => {
    const { session, commands, proposal } = await create();
    const source = session.definition()!.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected a utility setup source');
    session.applyDefinition({ ...session.definition()!, sources: [{ ...source, selectionMode: 'meter',
      selection: { kind: 'fixed', resource: 'meter', guids: ['deleted-meter'] } }] });
    expect(await session.flush()).toBe(true);
    expect(session.definition()!.sources[0]).toMatchObject({ selection: { guids: ['deleted-meter'] } });
    session.form.controls.name.setValue('Local recovery');
    const deletion = await commands.submit({ kind: 'delete', accountGuid: account.guid,
      guid: proposal.guid, expectedRevision: session.savedRevision() });
    expect(deletion.state).toBe('committed'); TestBed.tick();
    expect(session.isMissing()).toBe(true); expect(session.definition()?.name).toBe('Local recovery');
    expect(session.needsProtection()).toBe(true); expect(await session.flush()).toBe(false);
    expect(await harness.getAll('savedVisualizations')).toEqual([]);
  });
});
