import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import type { VisualizationDefinition, VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';
import type { VisualizationFacilityCatalog } from '@domain/visualizations/visualization-facilities';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocalStorageService } from 'ngx-webstorage';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness, IndexedDbTestRecord } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { AccountWorkspaceService } from '../account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { SavedVisualizationCommands } from '../saved-visualization-commands.service';
import { VisualizationCommandHandler } from './visualization-command-handler.service';

describe('saved visualization native commands', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('visualization-commands');
    await harness.seed({ accounts: [account], facilities: [facility] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  function proposal() {
    return { kind: 'create' as const, accountGuid: account.guid, guid: 'visualization-a',
      definition: utilityVisualizationFixture({ kind: 'fixed', facilityGuids: [facility.guid] }), createdDate: '2026-11-11T00:00:00.000Z' };
  }

  it('creates incomplete or missing-source intent, retries once by identity, duplicates independently, and reopens saved edits', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler);
    const command = proposal();
    const saved = await handler.create(command, account.guid);
    expect(saved.createdDate).toBeInstanceOf(Date);
    expect(saved.modifiedDate).toBeInstanceOf(Date);
    expect(await handler.create(structuredClone(command), account.guid)).toEqual(saved);
    expect((await handler.inspect(saved)).map(ref => ref.reason)).toEqual(['missing', 'missing']);
    const duplicate = await handler.duplicate({ ...command, kind: 'duplicate', guid: 'visualization-copy', sourceGuid: saved.guid,
      expectedRevision: saved.revision, definition: { ...command.definition, name: 'Independent copy' } }, account.guid);
    const updated = await handler.update({ kind: 'update', accountGuid: account.guid, guid: saved.guid, expectedRevision: 1,
      definition: { ...command.definition, name: 'Renamed chart' } }, account.guid);
    expect(updated.revision).toBe(2);
    await harness.reopen();
    expect(await harness.getAll('savedVisualizations')).toEqual([updated, duplicate]);
    expect((duplicate.definition as any).name).toBe('Independent copy');
  });



  async function inclusionCommand(saved: IdbSavedVisualization, targetFacilities: VisualizationFacilitySelection) {
    const facilities = await harness.getAll('facilities'), meters = await harness.getAll('utilityMeter');
    const catalog = { facilities, meters, meterGroups: [], predictors: [], energyUseGroups: [], energyUseEquipment: [], facilityAnalyses: [], accountAnalyses: [] } as unknown as VisualizationFacilityCatalog;
    return { kind: 'retarget' as const, accountGuid: account.guid, guid: saved.guid, expectedRevision: saved.revision, targetFacilities,
      reviewedDefinition: prepareVisualizationFacilityChange(saved.definition as VisualizationDefinition, targetFacilities, catalog, saved.preservation?.references).definition };
  }

  it('accepts normalized review metadata without turning an inclusion edit into a rename', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    command.definition = { ...command.definition, name: ' Original ', appearance: { legend: true, title: ' Title ' } };
    const saved = await handler.create(command, account.guid);
    const reviewed = await inclusionCommand(saved, { kind: 'all' });
    reviewed.reviewedDefinition = { ...reviewed.reviewedDefinition, name: 'Original', appearance: { legend: true, title: 'Title' } };
    const committed = await handler.retarget(reviewed, account.guid);
    expect(committed.revision).toBe(2);
    expect(committed.definition).toMatchObject({ name: ' Original ', appearance: { title: ' Title ' }, facilitySelection: { kind: 'all' } });
  });

  it('changes inclusion atomically, retains compatible bindings and identity, and survives reopen', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    const target = { ...facility, id: 2, guid: 'facility-b' };
    await harness.seed({ facilities: [target], utilityMeter: [
      { guid: 'meter-a', accountId: account.guid, facilityId: facility.guid }, { guid: 'meter-b', accountId: account.guid, facilityId: target.guid }
    ] });
    command.definition = { ...command.definition, facilitySelection: { kind: 'fixed', facilityGuids: [facility.guid, target.guid] },
      period: { kind: 'fiscal-year', year: 2025 },
      sources: command.definition.sources.map(source => source.kind === 'utility' ? { ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b'] } } : source),
      series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left', overrides: [
        { resourceGuid: 'meter-a', color: '#123456' }, { resourceGuid: 'meter-b', lineStyle: 'dashed' }
      ] }] };
    const saved = await handler.create(command, account.guid);
    const moved = await handler.retarget(await inclusionCommand(saved, { kind: 'fixed', facilityGuids: [facility.guid] }), account.guid);
    expect(moved).toMatchObject({ id: saved.id, guid: saved.guid, revision: 2, createdDate: saved.createdDate,
      definition: { facilitySelection: { kind: 'fixed', facilityGuids: [facility.guid] }, period: command.definition.period, chart: command.definition.chart,
        sources: [{ selection: { guids: ['meter-a'] } }], series: [{ overrides: [{ resourceGuid: 'meter-a', color: '#123456' }] }] } });
    expect(moved).not.toHaveProperty('facilityId');
    await harness.reopen(); expect(await harness.getAll('savedVisualizations')).toEqual([moved]);
    const all = await TestBed.inject(VisualizationCommandHandler).retarget(await inclusionCommand(moved, { kind: 'all' }), account.guid);
    expect(all).toMatchObject({ guid: saved.guid, revision: 3, definition: { facilitySelection: { kind: 'all' }, sources: [{ selection: { guids: ['meter-a'] } }] } });
  });

  it('rejects stale revisions, missing and foreign facility targets without moving the record', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), saved = await handler.create(proposal(), account.guid);
    const command = await inclusionCommand(saved, { kind: 'all' });
    await expect(handler.retarget({ ...command, expectedRevision: 0 }, account.guid)).rejects.toMatchObject({ current: saved });
    await expect(handler.retarget({ ...command, targetFacilities: { kind: 'fixed', facilityGuids: ['missing'] } }, account.guid)).rejects.toMatchObject({ code: 'validation-failed' });
    await harness.seed({ facilities: [{ ...facility, id: 2, guid: 'foreign', accountId: 'account-b' }] });
    await expect(handler.retarget({ ...command, targetFacilities: { kind: 'fixed', facilityGuids: ['foreign'] } }, account.guid)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.retarget(command, 'account-b')).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(await harness.getAll('savedVisualizations')).toEqual([saved]);
  });

  it('retains an already missing facility while narrowing inclusion but rejects newly introduced missing identities', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    const other = { ...facility, id: 2, guid: 'facility-b' }, removed = { ...facility, id: 3, guid: 'missing-facility' };
    await harness.seed({ facilities: [other, removed] });
    command.definition = { ...command.definition, facilitySelection: { kind: 'fixed', facilityGuids: [facility.guid, other.guid, removed.guid] } };
    const saved = await handler.create(command, account.guid);
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['facilities'], 'readwrite', tx => tx.deleteByKey('facilities', removed.id));
    const targetFacilities: VisualizationFacilitySelection = { kind: 'fixed', facilityGuids: [facility.guid, removed.guid] };
    const narrowed = await handler.retarget(await inclusionCommand(saved, targetFacilities), account.guid);
    expect(narrowed).toMatchObject({ id: saved.id, guid: saved.guid, revision: 2, definition: { facilitySelection: targetFacilities } });
    expect((await handler.inspect(narrowed)).some(ref => ref.guid === removed.guid && ref.reason === 'missing')).toBe(true);
    await expect(handler.retarget(await inclusionCommand(narrowed, { kind: 'fixed', facilityGuids: [facility.guid, removed.guid, 'introduced-missing'] }), account.guid))
      .rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.create({ ...proposal(), guid: 'new-missing', definition: { ...proposal().definition, facilitySelection: { kind: 'fixed', facilityGuids: [removed.guid] } } }, account.guid))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(await harness.getAll('savedVisualizations')).toEqual([narrowed]);
  });

  it('rejects a catalog change that would clear more than the reviewed inclusion proposal', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), target = { ...facility, id: 2, guid: 'facility-b' };
    await harness.seed({ facilities: [target], utilityMeter: [{ guid: 'meter-a', accountId: account.guid, facilityId: facility.guid }] });
    const initial = proposal(); initial.definition = { ...initial.definition, facilitySelection: { kind: 'all' } };
    const saved = await handler.create(initial, account.guid), command = await inclusionCommand(saved, { kind: 'fixed', facilityGuids: [facility.guid] });
    const meter = (await harness.getAll('utilityMeter'))[0];
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['utilityMeter'], 'readwrite', tx => tx.put('utilityMeter', { ...meter, facilityId: target.guid }));
    await expect(handler.retarget(command, account.guid)).rejects.toMatchObject({ current: saved });
    expect(await harness.getAll('savedVisualizations')).toEqual([saved]);
  });

  it.each([false, true])('preserves unverified source relationships during inclusion review unless locked (locked: %s)', async locked => {
    const preservation = { locked, references: [{ path: 'sources.0.selection.guids.0', kind: 'meter' as const, guid: 'meter-a', reason: 'not-transferred' as const }], transfers: [] };
    const handler = TestBed.inject(VisualizationCommandHandler), saved = await handler.create(proposal(), account.guid);
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['savedVisualizations'], 'readwrite', tx => tx.put('savedVisualizations', { ...saved, preservation }));
    if (locked) {
      await expect(handler.retarget(await inclusionCommand(saved, { kind: 'all' }), account.guid)).rejects.toThrow('Repair this visualization');
      expect(await harness.getAll('savedVisualizations')).toEqual([{ ...saved, preservation }]);
    } else {
      const retargeted = await handler.retarget(await inclusionCommand(saved, { kind: 'all' }), account.guid);
      expect(retargeted.preservation).toEqual(preservation); expect(readSavedVisualization(retargeted).state).toBe('repair-required');
      expect(retargeted.revision).toBe(saved.revision + 1);
    }
  });

  it('retains imported identities and related style across destination collisions, prunes verified exclusions, and reopens protected', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), base = proposal().definition;
    const excludedFacility = { ...facility, id: 2, guid: 'facility-b' };
    const blocked = 'retained-origin-guid', verified = 'verified-excluded';
    const definition: VisualizationDefinition = { ...base, facilitySelection: { kind: 'all' },
      sources: base.sources.map(source => source.kind === 'utility' ? { ...source,
        selection: { kind: 'fixed', resource: 'meter', guids: [verified, blocked] } } : source),
      series: [
        { id: 'verified', sourceId: 'utility', metric: 'energy', resourceGuid: verified, axis: 'left', color: '#111111' },
        { id: 'trace', sourceId: 'utility', metric: 'energy', resourceGuid: blocked, label: 'Original resource', axis: 'left', color: '#123456' },
        { id: 'members', sourceId: 'utility', metric: 'energy', axis: 'left', overrides: [
          { resourceGuid: blocked, label: 'Original member' }, { seriesId: `utility:${blocked}`, lineStyle: 'dashed' },
          { resourceGuid: verified, color: '#111111' }, { seriesId: `utility:${verified}`, color: '#111111' }
        ] }
      ] };
    const references = [
      { path: 'sources.0.selection.guids.1', kind: 'meter' as const, guid: blocked, reason: 'not-transferred' as const },
      { path: 'series.1.resourceGuid', kind: 'meter' as const, guid: blocked, reason: 'not-transferred' as const }
    ];
    const transfers = [{ accountId: 'origin', targetAccountId: account.guid, maps: {} }];
    const original: IdbSavedVisualization = { guid: 'imported-collision', accountId: account.guid, recordVersion: 1, revision: 3,
      createdDate: new Date('2026-11-11T00:00:00.000Z'), modifiedDate: new Date('2026-11-12T00:00:00.000Z'),
      definition, preservation: { references, transfers } };
    await harness.seed({ facilities: [excludedFacility], utilityMeter: [blocked, verified].map(guid => ({ guid, accountId: account.guid, facilityId: excludedFacility.guid })),
      savedVisualizations: [{ ...original }] });
    const saved = (await harness.getAll<IdbSavedVisualization & IndexedDbTestRecord>('savedVisualizations'))[0];
    const reviewed = await inclusionCommand(saved, { kind: 'fixed', facilityGuids: [facility.guid] });
    const committed = await handler.retarget(reviewed, account.guid);
    expect(committed).toMatchObject({ id: saved.id, guid: saved.guid, createdDate: saved.createdDate, revision: saved.revision + 1 });
    expect(committed.definition).toEqual(reviewed.reviewedDefinition);
    expect((committed.definition as VisualizationDefinition).sources[0]).toMatchObject({ selection: { guids: [blocked] } });
    expect((committed.definition as VisualizationDefinition).series).toEqual([definition.series[1], {
      ...definition.series[2], overrides: definition.series[2].overrides!.slice(0, 2)
    }]);
    expect(committed.preservation).toEqual({ transfers, references: [
      { ...references[0], path: 'sources.0.selection.guids.0' }, { ...references[1], path: 'series.0.resourceGuid' }
    ] });
    expect(readSavedVisualization(committed).state).toBe('repair-required');
    expect((await handler.inspect(committed)).filter(ref => ref.reason === 'not-transferred')).toEqual(committed.preservation!.references);
    await harness.reopen(); expect(await harness.getAll('savedVisualizations')).toEqual([committed]);
    const reopened = (await harness.getAll<IdbSavedVisualization & IndexedDbTestRecord>('savedVisualizations'))[0];
    expect(readSavedVisualization(reopened).state).toBe('repair-required');
  });

  it.each([false, true])('repairs reviewed facility inclusion and remaps unrelated preserved identities (unrelated source issue: %s)', async keepUnrelated => {
    const handler = TestBed.inject(VisualizationCommandHandler), base = proposal().definition;
    const missingFacility = 'missing-facility', missingMeter = 'missing-meter', retainedMissingFacility = 'retained-missing-facility';
    const ids = keepUnrelated ? [facility.guid, 'facility-b', missingFacility, retainedMissingFacility] : [facility.guid, missingFacility];
    const definition: VisualizationDefinition = { ...base, facilitySelection: { kind: 'fixed', facilityGuids: ids },
      sources: base.sources.map(source => source.kind === 'utility' && keepUnrelated
        ? { ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b', missingMeter, 'meter-a'] } } : source) };
    const transfers = [{ accountId: 'origin', targetAccountId: account.guid, maps: { facility: { 'origin-facility': facility.guid } } }];
    const references = [
      { path: 'facilitySelection.facilityGuids.0', kind: 'facility' as const, guid: facility.guid, reason: 'not-transferred' as const },
      { path: `facilitySelection.facilityGuids.${ids.indexOf(missingFacility)}`, kind: 'facility' as const, guid: missingFacility, reason: 'missing' as const },
      ...(keepUnrelated ? [{ path: 'facilitySelection.facilityGuids.3', kind: 'facility' as const, guid: retainedMissingFacility, reason: 'not-transferred' as const }] : []),
      ...(keepUnrelated ? [{ path: 'sources.0.selection.guids.1', kind: 'meter' as const, guid: missingMeter, reason: 'not-transferred' as const }] : [])
    ];
    const initial: IdbSavedVisualization = { guid: 'imported-facilities', accountId: account.guid, facilityId: 'stale-facility', recordVersion: 1,
      revision: 3, createdDate: new Date('2026-11-11T00:00:00.000Z'), modifiedDate: new Date('2026-11-12T00:00:00.000Z'),
      definition, preservation: { references, transfers } };
    await harness.seed({ facilities: [{ ...facility, id: 2, guid: 'facility-b' }], utilityMeter: [
      { guid: 'meter-a', accountId: account.guid, facilityId: facility.guid }, { guid: 'meter-b', accountId: account.guid, facilityId: 'facility-b' }
    ], savedVisualizations: [{ ...initial }] });
    const saved = (await harness.getAll<IdbSavedVisualization & IndexedDbTestRecord>('savedVisualizations'))[0];
    expect(readSavedVisualization(saved).state).toBe('repair-required');
    const targetFacilities: VisualizationFacilitySelection = { kind: 'fixed', facilityGuids: keepUnrelated ? [facility.guid, retainedMissingFacility] : [facility.guid] };
    const committed = await handler.retarget(await inclusionCommand(saved, targetFacilities), account.guid);
    expect(committed).toMatchObject({ guid: saved.guid, id: saved.id, createdDate: saved.createdDate, revision: saved.revision + 1,
      definition: { facilitySelection: targetFacilities } });
    expect(committed).not.toHaveProperty('facilityId'); expect(committed.preservation?.transfers).toEqual(transfers);
    expect(committed.preservation?.references).toEqual(keepUnrelated
      ? [{ ...references[2], path: 'facilitySelection.facilityGuids.1' }, { ...references[3], path: 'sources.0.selection.guids.0' }] : []);
    expect(readSavedVisualization(committed).state).toBe(keepUnrelated ? 'repair-required' : 'valid');
    if (keepUnrelated) expect((committed.definition as VisualizationDefinition).sources[0]).toMatchObject({ selection: { guids: [missingMeter, 'meter-a'] } });
    await harness.reopen(); expect(await harness.getAll('savedVisualizations')).toEqual([committed]);
  });

  it('keeps verified transfer history and unknown identities during inclusion changes', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), saved = await handler.create(proposal(), account.guid);
    const preservation = { references: [], transfers: [{ accountId: 'origin', targetAccountId: account.guid, maps: { meter: { 'origin-meter': 'meter-a' } } }] };
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['savedVisualizations'], 'readwrite', tx => tx.put('savedVisualizations', { ...saved, preservation }));
    const moved = await handler.retarget(await inclusionCommand(saved, { kind: 'all' }), account.guid);
    expect(moved.preservation).toEqual(preservation);
    expect((moved.definition as VisualizationDefinition).sources[0]).toMatchObject({ selection: { guids: ['meter-a'] } });
  });

  it('rolls back an inclusion write and retries the same reviewed target', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), saved = await handler.create(proposal(), account.guid);
    const command = await inclusionCommand(saved, { kind: 'all' });
    const put = IndexedDbTransactionContext.prototype.put;
    const failure = vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementationOnce(async function(store, value) {
      await put.call(this, store, value); throw new Error('Abort inclusion write');
    });
    await expect(handler.retarget(command, account.guid)).rejects.toThrow('Abort inclusion write'); failure.mockRestore();
    expect(await harness.getAll('savedVisualizations')).toEqual([saved]);
    expect(await handler.retarget(command, account.guid)).toMatchObject({ guid: saved.guid, revision: 2, definition: { facilitySelection: { kind: 'all' } } });
  });

  it('rejects stale revisions, scope changes, foreign owners, and malformed definitions without writing', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler);
    const command = proposal(), saved = await handler.create(command, account.guid);
    const update = { kind: 'update' as const, accountGuid: account.guid, guid: saved.guid, expectedRevision: 1, definition: command.definition };
    const next = await handler.update({ ...update, definition: { ...command.definition, name: 'Current chart' } }, account.guid);
    await expect(handler.update(update, account.guid)).rejects.toMatchObject({ current: next });
    await expect(handler.delete({ kind: 'delete', accountGuid: account.guid, guid: saved.guid, expectedRevision: 1 }, account.guid)).rejects.toMatchObject({ current: next });
    await expect(handler.update({ ...update, expectedRevision: 2, definition: { ...command.definition, facilitySelection: { kind: 'all' } } }, account.guid)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.create({ ...command, guid: 'foreign' }, 'account-b')).rejects.toMatchObject({ code: 'cross-account-entity' });
    await expect(handler.create({ ...command, guid: 'invalid', definition: { ...command.definition, name: '' } }, account.guid)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(await harness.getAll('savedVisualizations')).toEqual([next]);
  });

  it('rolls back a failed transaction, preserves the proposal, and retries without a partial record', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    const original = IndexedDbTransactionContext.prototype.add;
    const failure = vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementationOnce(async function(store, value) {
      await original.call(this, store, value); throw new Error('Abort after request');
    });
    await expect(handler.create(command, account.guid)).rejects.toThrow('Abort after request');
    failure.mockRestore();
    await harness.reopen();
    expect(await harness.getAll('savedVisualizations')).toEqual([]);
    const saved = await TestBed.inject(VisualizationCommandHandler).create(command, account.guid);
    expect(saved.guid).toBe(command.guid);
    expect(await harness.getAll('savedVisualizations')).toHaveLength(1);
  });

  it('recovers committed creation publication without a second mutation and deletes atomically', async () => {
    const workspace = TestBed.inject(AccountWorkspaceService);
    await workspace.selectAccount(account.guid);
    const commands = TestBed.inject(SavedVisualizationCommands), handler = TestBed.inject(VisualizationCommandHandler);
    const write = vi.spyOn(handler, 'create');
    vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication unavailable'));
    const command = commands.prepareCreate(proposal().definition);
    const outcome = await commands.submit(command);
    expect(outcome.state).toBe('refresh-required');
    const recovered = await commands.recover(account.guid, command.guid);
    expect(recovered).toMatchObject({ state: 'valid', record: { guid: command.guid, revision: 1 } });
    expect(write).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(AccountWorkspaceStore).savedVisualizations()).toHaveLength(1);
    const deletion = await commands.submit({ kind: 'delete', accountGuid: account.guid, guid: command.guid, expectedRevision: 1 });
    expect(deletion.state).toBe('committed');
    await harness.reopen();
    expect(await harness.getAll('savedVisualizations')).toEqual([]);
  });

  it('keeps locked transfers unavailable until explicit source review and leaves other account records untouched', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    const preserved: IdbSavedVisualization = { guid: command.guid, accountId: account.guid, facilityId: facility.guid,
      recordVersion: 1, revision: 1, createdDate: new Date(command.createdDate), modifiedDate: new Date(command.createdDate), definition: command.definition,
      preservation: { locked: true, references: [{ path: 'sources.0.selection.guids.0', kind: 'meter', guid: 'meter-a', reason: 'not-transferred' }], transfers: [] } };
    const other = { ...preserved, guid: 'other-account-chart', accountId: 'account-b' };
    await harness.seed({ savedVisualizations: [{ ...preserved }, { ...other }], utilityMeter: [{ guid: 'meter-a', accountId: account.guid, facilityId: facility.guid }] });
    const update = { kind: 'update' as const, accountGuid: account.guid, guid: command.guid, expectedRevision: 1, definition: command.definition };
    await expect(handler.update(update, account.guid)).rejects.toThrow('Explicitly review');
    const missing = { ...command.definition, sources: command.definition.sources.map(source => ({ ...source,
      selection: { kind: 'fixed' as const, resource: 'meter' as const, guids: ['missing-meter'] } })) };
    await expect(handler.update({ ...update, definition: missing, repair: { acknowledgeTransfer: true, referencePaths: [] } }, account.guid))
      .rejects.toThrow('Reviewed replacement sources');
    const repaired = await handler.update({ ...update, repair: { acknowledgeTransfer: true, referencePaths: ['sources.0.selection.guids.0'] } }, account.guid);
    expect(repaired.preservation).toBeUndefined();
    expect(await handler.inspect(repaired)).toEqual([]);
    expect((await harness.getAll<any>('savedVisualizations')).find(record => record.guid === other.guid)).toMatchObject(other);
  });

  it('keeps readable inclusion immutable during ordinary edits while preserved references require repair', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    const saved = await handler.create(command, account.guid);
    const preservation = { references: [{ path: 'sources.0.selection.guids.0', kind: 'meter' as const,
      guid: 'meter-a', reason: 'not-transferred' as const }], transfers: [] };
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['savedVisualizations'], 'readwrite', tx => tx.put('savedVisualizations', { ...saved, preservation }));
    const update = { kind: 'update' as const, accountGuid: account.guid, guid: saved.guid, expectedRevision: saved.revision,
      definition: { ...command.definition, facilitySelection: { kind: 'all' as const } } };
    await expect(handler.update(update, account.guid)).rejects.toThrow('reviewed facility selection command');
    await expect(handler.update({ ...update, repair: { acknowledgeTransfer: true, referencePaths: [] } }, account.guid))
      .rejects.toThrow('reviewed facility selection command');
    expect(await harness.getAll('savedVisualizations')).toEqual([{ ...saved, preservation }]);
    const renamed = await handler.update({ ...update, definition: { ...command.definition, name: 'Unrelated rename' } }, account.guid);
    expect(renamed).toMatchObject({ revision: saved.revision + 1, preservation,
      definition: { name: 'Unrelated rename', facilitySelection: command.definition.facilitySelection } });
    expect(await harness.getAll('savedVisualizations')).toEqual([renamed]);
  });

  it('still requires explicit replacement for an unreadable payload masked by preserved-reference status', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler), command = proposal();
    const saved = await handler.create(command, account.guid);
    const opaque = { ...saved, definition: { version: 99, future: 'retain' }, preservation: {
      references: [{ path: 'unknown', kind: 'unknown' as const, guid: 'unknown', reason: 'unclassified' as const }], transfers: []
    } };
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['savedVisualizations'], 'readwrite', tx => tx.put('savedVisualizations', opaque));
    await expect(handler.update({ kind: 'update', accountGuid: account.guid, guid: saved.guid, expectedRevision: saved.revision,
      definition: command.definition }, account.guid)).rejects.toThrow('Explicitly review');
    expect(await harness.getAll('savedVisualizations')).toEqual([opaque]);
  });
});
