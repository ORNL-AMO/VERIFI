import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocalStorageService } from 'ngx-webstorage';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
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
      definition: utilityVisualizationFixture({ kind: 'facility', facilityGuid: facility.guid }), createdDate: '2026-11-11T00:00:00.000Z' };
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

  it('duplicates a historical v1 record as equivalent v2 intent, retries by stable identity, and leaves the source unchanged', async () => {
    const definition = { ...proposal().definition, version: 1 };
    const historical: IdbSavedVisualization = { guid: 'historical-chart', accountId: account.guid, facilityId: facility.guid,
      recordVersion: 1, revision: 7, createdDate: new Date('2026-11-10T00:00:00Z'),
      modifiedDate: new Date('2026-11-11T00:00:00Z'), definition };
    await harness.seed({ savedVisualizations: [{ ...historical }] });
    const stored = (await harness.getAll<IdbSavedVisualization & IndexedDbTestRecord>('savedVisualizations'))[0];
    const before = structuredClone(stored);
    const commands = TestBed.inject(SavedVisualizationCommands), handler = TestBed.inject(VisualizationCommandHandler);
    const duplicate = commands.prepareDuplicate(stored, 'Historical independent copy');
    expect(duplicate.definition.version).toBe(2);
    const commandBefore = structuredClone(duplicate);
    const created = await handler.duplicate(duplicate, account.guid);
    expect(created.definition).toEqual({ ...proposal().definition, name: 'Historical independent copy' });
    expect(created.guid).not.toBe(stored.guid); expect(created.revision).toBe(1);
    expect(await handler.duplicate(structuredClone(duplicate), account.guid)).toEqual(created);
    await harness.reopen();
    const records = await harness.getAll<IdbSavedVisualization & IndexedDbTestRecord>('savedVisualizations');
    expect(records).toHaveLength(2);
    expect(records.find(record => record.guid === stored.guid)).toEqual(before);
    expect(records.find(record => record.guid === stored.guid)?.definition).toEqual(definition);
    expect(await TestBed.inject(VisualizationCommandHandler).duplicate(duplicate, account.guid)).toEqual(created);
    expect(duplicate).toEqual(commandBefore);
  });

  it('rejects stale revisions, scope changes, foreign owners, and malformed definitions without writing', async () => {
    const handler = TestBed.inject(VisualizationCommandHandler);
    const command = proposal(), saved = await handler.create(command, account.guid);
    const update = { kind: 'update' as const, accountGuid: account.guid, guid: saved.guid, expectedRevision: 1, definition: command.definition };
    const next = await handler.update({ ...update, definition: { ...command.definition, name: 'Current chart' } }, account.guid);
    await expect(handler.update(update, account.guid)).rejects.toMatchObject({ current: next });
    await expect(handler.delete({ kind: 'delete', accountGuid: account.guid, guid: saved.guid, expectedRevision: 1 }, account.guid)).rejects.toMatchObject({ current: next });
    await expect(handler.update({ ...update, expectedRevision: 2, definition: { ...command.definition, scope: { kind: 'portfolio' } } }, account.guid)).rejects.toMatchObject({ code: 'validation-failed' });
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
});
