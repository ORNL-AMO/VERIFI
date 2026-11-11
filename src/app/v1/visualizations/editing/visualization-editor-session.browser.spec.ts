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
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
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

  async function create() {
    const commands = TestBed.inject(SavedVisualizationCommands);
    const proposal = commands.prepareCreate(createVisualizationDefinition('Original', account.guid,
      { kind: 'facility', facilityGuid: facility.guid }, 'utility'));
    expect((await commands.submit(proposal)).state).toBe('committed');
    const session = TestBed.runInInjectionContext(() => new VisualizationEditorSession());
    session.open(account.guid, proposal.guid); TestBed.tick();
    return { commands, proposal, session };
  }

  it('saves metadata and rehydrates a fresh session from the durable record after database reopen', async () => {
    const { session, proposal } = await create();
    session.form.patchValue({ name: ' Durable name ', title: 'Current utility use', legend: false });
    expect(await session.flush()).toBe(true);
    const previous = TestBed.inject(AccountWorkspaceStore).snapshot()!;
    await harness.reopen();
    const saved = await harness.getAll<IdbSavedVisualization & { [key: string]: unknown }>('savedVisualizations');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ guid: proposal.guid, revision: 2,
      definition: { name: 'Durable name', appearance: { title: 'Current utility use', legend: false } } });
    const store = TestBed.inject(AccountWorkspaceStore);
    store.publish({ ...previous, savedVisualizations: saved });
    // Reopening destroys all original providers. This fresh editor reads the reopened committed snapshot;
    // no command is necessary until a new user edit, so a missing command registration fails loudly.
    const injector = createEnvironmentInjector([VisualizationEditorSession,
      { provide: SavedVisualizationCommands, useValue: { submit: () => { throw new Error('Unexpected hydration write'); } } }], TestBed.inject(EnvironmentInjector));
    try {
      const reopened = injector.get(VisualizationEditorSession); reopened.open(account.guid, proposal.guid); TestBed.tick();
      expect(reopened.form.getRawValue()).toEqual({ name: 'Durable name', title: 'Current utility use', legend: false });
      expect(reopened.state()).toBe('saved'); expect(reopened.needsProtection()).toBe(false);
    } finally { injector.destroy(); }
  });

  it('recovers committed publication after an editor save without repeating its IndexedDB update', async () => {
    const { session, proposal } = await create();
    const handler = TestBed.inject(VisualizationCommandHandler), update = vi.spyOn(handler, 'update');
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

  it('retains missing-source intent and an externally deleted draft without writing a replacement', async () => {
    const { session, commands, proposal } = await create();
    const source = session.definition()!.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected a utility setup source');
    session.applyDefinition({ ...session.definition()!, sources: [{ ...source,
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
