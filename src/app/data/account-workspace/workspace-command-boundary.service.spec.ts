import { vi } from 'vitest';
import { AccountWorkspaceStore } from './account-workspace.store';
import { AccountWorkspaceSnapshot } from './account-workspace.models';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from './account-workspace-patches';
import { WorkspaceCommandBoundary } from './workspace-command-boundary.service';
import { WorkspaceChangeKind, WorkspaceEntityKind, WorkspaceWriteError } from './workspace-commands.models';

describe('WorkspaceCommandBoundary', () => {
  it('rejects a command when the workspace is not ready', async () => {
    const { boundary } = createBoundary();

    await expect(boundary.execute(makeOptions(), () => Promise.resolve('x'))).rejects.toThrow(WorkspaceWriteError);
    await expect(boundary.execute(makeOptions(), () => Promise.resolve('x'))).rejects.toMatchObject({
      code: 'workspace-not-ready', persistenceCommitted: false
    });
  });

  it('recovers committed publication without repeating persistence', async () => {
    const { boundary, store, workspaceService } = createBoundary(); publishReady(store);
    workspaceService.reloadActiveWorkspace.mockRejectedValueOnce(new Error('refresh failed')).mockResolvedValue('published');
    const persist = vi.fn(async () => 'saved');
    await expect(boundary.execute(makeOptions(), persist)).rejects.toMatchObject({ persistenceCommitted: true });
    await boundary.recoverCommittedPublication(store.account()!.guid);
    expect(persist).toHaveBeenCalledTimes(1); expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledTimes(2);
    expect(store.hasPending()).toBe(false);
    await boundary.recoverCommittedPublication(store.account()!.guid); expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledTimes(2);
  });

  it('rejects a command when the workspace is loading', async () => {
    const { boundary, store } = createBoundary();
    store.beginLoad(false);

    await expect(boundary.execute(makeOptions(), () => Promise.resolve('x'))).rejects.toMatchObject({
      code: 'workspace-not-ready'
    });
  });

  it('sets pending before persistence and clears it after success', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);

    let pendingDuringPersist = false;
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    await boundary.execute(makeOptions(), async () => {
      pendingDuringPersist = store.hasPending();
      return 'saved';
    });

    expect(pendingDuringPersist).toBe(true);
    expect(store.hasPending()).toBe(false);
  });

  it('keeps editor ownership on transient pending work without publishing it as entity data', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store); workspaceService.reloadActiveWorkspace.mockResolvedValue('published');
    const committed = vi.fn(); boundary.committedChange$.subscribe(committed);
    await boundary.execute({ ...makeOptions(), ownerId: 'settings-editor' }, async () => {
      expect(store.pendingOperations()).toEqual([expect.objectContaining({ ownerId: 'settings-editor' })]);
      return 'saved';
    });
    expect(store.pendingOperations()).toEqual([]);
    expect(committed.mock.calls[0][0]).not.toHaveProperty('ownerId');
  });

  it('clears pending and wraps the error when persistence fails', async () => {
    const { boundary, store } = createBoundary();
    publishReady(store);

    const cause = new Error('db unavailable');
    await expect(
      boundary.execute(makeOptions(), () => Promise.reject(cause))
    ).rejects.toMatchObject({ code: 'persistence-failed', cause, persistenceCommitted: false });

    expect(store.hasPending()).toBe(false);
  });

  it('re-throws a WorkspaceWriteError from persistence without double-wrapping', async () => {
    const { boundary, store } = createBoundary();
    publishReady(store);

    const original = new WorkspaceWriteError('validation-failed', 'bad input');
    const caught = await boundary.execute(makeOptions(), () => Promise.reject(original)).catch(e => e);

    expect(caught).toBe(original);
    expect(caught.code).toBe('validation-failed');
    expect(caught.persistenceCommitted).toBe(false);
  });

  it('leaves workspace state unchanged when persistence fails', async () => {
    const { boundary, store } = createBoundary();
    publishReady(store);
    const revisionBefore = store.revision();
    const accountBefore = store.account()?.guid;

    await boundary.execute(makeOptions(), () => Promise.reject(new Error('fail'))).catch(() => undefined);

    expect(store.revision()).toBe(revisionBefore);
    expect(store.account()?.guid).toBe(accountBefore);
    expect(store.hasPending()).toBe(false);
  });

  it.each(['reload', 'patch'] as const)('distinguishes a committed write from a failed %s publication', async publication => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    const cause = new Error('reload unavailable');
    workspaceService.reloadActiveWorkspace.mockRejectedValue(cause);
    const persist = vi.fn().mockResolvedValue('saved');
    const committed = vi.fn(); boundary.committedChange$.subscribe(committed);
    const options = publication === 'patch'
      ? { ...makeOptions(), publication: { mode: 'patch' as const, buildPatch: () => { throw new Error('invalid patch'); } } }
      : { ...makeOptions(), publication: { mode: 'reload' as const } };

    await expect(boundary.execute(options, persist)).rejects.toMatchObject({
      code: 'persistence-failed',
      message: 'Workspace reload failed after meter update.',
      cause,
      persistenceCommitted: true
    });

    expect(persist).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledExactlyOnceWith(true);
    expect(committed).not.toHaveBeenCalled();
    expect(store.hasPending()).toBe(false);
  });

  it('emits one committed-change event per successful command', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    const changes: unknown[] = [];
    boundary.committedChange$.subscribe(c => changes.push(c));

    await boundary.execute(makeOptions('meter', 'update', 'meter-guid-1'), () => Promise.resolve(null));

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      entityKind: 'meter',
      changeKind: 'update',
      entityGuid: 'meter-guid-1',
      accountGuid: 'account-a'
    });
  });

  it('repairs a failed committed publication before the next queued callback reads the workspace', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    const original = publishReady(store);
    store.publishCommitted(original, {});
    const recovered = { ...original, account: { ...original.account, name: 'Durable B' } };
    workspaceService.reloadActiveWorkspace.mockRejectedValueOnce(new Error('committed reload failed'));
    workspaceService.reloadActiveWorkspace.mockImplementationOnce(async committed => {
      expect(committed).toBe(true);
      expect(store.pendingOperations()).toEqual([expect.objectContaining({ ownerId: 'retry-editor' })]);
      store.publishCommitted(recovered, {});
      return 'published';
    });
    const changes = vi.fn(); boundary.committedChange$.subscribe(changes);
    const first = boundary.execute(makeOptions('account', 'update', 'first'), async () => 'Durable B').catch(error => error);
    const next = boundary.execute({ ...makeOptions('account', 'update', 'next'), ownerId: 'retry-editor' }, async () => {
      expect(store.pendingOperations()).toEqual([expect.objectContaining({ ownerId: 'retry-editor' })]);
      return store.account()!.name;
    });

    expect(await first).toMatchObject({ persistenceCommitted: true });
    expect((await next).value).toBe('Durable B');
    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true]]);
    expect(store.committedRevision()).toEqual({ accountGuid: 'account-a', revision: 2 });
    expect(changes).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ entityGuid: 'next' }));
    expect(store.hasPending()).toBe(false);

    await boundary.execute(makeOptions(), async () => 'ordinary command');
    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true], [true]]);
    expect(changes).toHaveBeenCalledTimes(2);
  });

  it('blocks writes through repeated repair failures and repairs successfully before a later retry', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    const original = publishReady(store);
    const cause = new Error('reload unavailable');
    workspaceService.reloadActiveWorkspace.mockRejectedValue(cause);
    const changes = vi.fn(); boundary.committedChange$.subscribe(changes);
    await expect(boundary.execute(makeOptions(), async () => 'committed')).rejects.toMatchObject({ persistenceCommitted: true });
    const persist = vi.fn(async () => store.account()!.name);

    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(boundary.execute({ ...makeOptions(), ownerId: 'retry-editor' }, persist)).rejects.toMatchObject({
        code: 'persistence-failed', cause, persistenceCommitted: false
      });
      expect(store.hasPending()).toBe(false);
    }
    expect(persist).not.toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();
    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true]]);

    workspaceService.reloadActiveWorkspace.mockImplementationOnce(async committed => {
      expect(committed).toBe(true);
      store.publishCommitted({ ...original, account: { ...original.account, name: 'Recovered' } }, {});
      return 'published';
    }).mockResolvedValue('published');
    expect((await boundary.execute(makeOptions(), persist)).value).toBe('Recovered');
    expect(persist).toHaveBeenCalledOnce(); expect(changes).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true], [true], [true]]);
  });

  it.each(['published', 'superseded'] as const)('does not run an old-account callback when repair is %s after an account switch', async result => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockRejectedValueOnce(new Error('committed reload failed'));
    await boundary.execute(makeOptions(), async () => 'committed').catch(() => undefined);
    workspaceService.reloadActiveWorkspace.mockImplementationOnce(async () => {
      store.publish(makeSnapshot('account-b'), {});
      return result;
    });
    const persist = vi.fn().mockResolvedValue('old-account write');

    await expect(boundary.execute({ ...makeOptions(), ownerId: 'old-editor' }, persist)).rejects.toMatchObject({
      code: 'stale-workspace', persistenceCommitted: false
    });

    expect(persist).not.toHaveBeenCalled(); expect(store.account()?.guid).toBe('account-b');
    expect(store.pendingOperations()).toEqual([]);
    await expect(boundary.execute(makeOptions(), async () => 'new-account write')).resolves.toMatchObject({
      value: 'new-account write', change: { accountGuid: 'account-b' }
    });
    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true]]);
  });

  it('repairs after an already marked committed failure without wrapping its original error', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    const original = new WorkspaceWriteError('persistence-failed', 'Already committed', undefined, true);
    await expect(boundary.execute(makeOptions(), async () => { throw original; })).rejects.toBe(original);
    workspaceService.reloadActiveWorkspace.mockRejectedValueOnce(original);
    const blockedPersist = vi.fn().mockResolvedValue('must not write');
    await expect(boundary.execute(makeOptions(), blockedPersist)).rejects.toMatchObject({
      persistenceCommitted: false, cause: original
    });
    expect(blockedPersist).not.toHaveBeenCalled();
    workspaceService.reloadActiveWorkspace.mockImplementationOnce(async committed => {
      expect(committed).toBe(true);
      store.publishCommitted(makeSnapshot('account-a'), {});
      return 'published';
    });

    await boundary.execute(makeOptions(), async () => 'retry');

    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true]]);
    expect(store.hasPending()).toBe(false);
  });

  it('retains the new account repair requirement when an old account command fails later', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    const started = deferred<void>(); const finish = deferred<void>();
    const oldAccount = boundary.execute(makeOptions(), async () => {
      started.resolve(undefined); await finish.promise;
      return 'old account committed';
    }).catch(error => error);
    await started.promise;
    store.publish(makeSnapshot('account-b'), {});
    workspaceService.reloadActiveWorkspace.mockRejectedValueOnce(new Error('account-b committed reload failed'));
    await expect(boundary.execute(makeOptions(), async () => 'account-b committed')).rejects.toMatchObject({
      persistenceCommitted: true
    });
    finish.resolve(undefined);
    expect(await oldAccount).toMatchObject({ code: 'stale-workspace', persistenceCommitted: true });
    workspaceService.reloadActiveWorkspace.mockImplementationOnce(async committed => {
      expect(committed).toBe(true);
      const recovered = makeSnapshot('account-b');
      store.publishCommitted({ ...recovered, account: { ...recovered.account, name: 'Recovered account B' } }, {});
      return 'published';
    });

    const result = await boundary.execute(makeOptions(), async () => store.account()!.name);

    expect(result.value).toBe('Recovered account B');
    expect(result.change.accountGuid).toBe('account-b');
    expect(workspaceService.reloadActiveWorkspace.mock.calls).toEqual([[true], [true], [true]]);
    expect(store.hasPending()).toBe(false);
  });

  it('passes notification hints through committed-change events', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    const changes: unknown[] = [];
    boundary.committedChange$.subscribe(c => changes.push(c));

    await boundary.execute({
      ...makeOptions('facility', 'delete', 'facility-a'),
      notification: {
        entityName: 'North Plant',
        successMessage: 'Meters and related data were removed.'
      }
    }, () => Promise.resolve(null));

    expect(changes[0]).toMatchObject({
      entityKind: 'facility',
      changeKind: 'delete',
      notification: {
        entityName: 'North Plant',
        successMessage: 'Meters and related data were removed.'
      }
    });
  });

  it('publishes a committed patch without reloading the workspace', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);

    const savedData = {
      id: 1,
      guid: 'data-a',
      accountId: 'account-a',
      facilityId: 'facility-a',
      meterId: 'meter-a'
    } as any;

    const result = await boundary.execute(
      {
        ...makeOptions('meterData', 'add', savedData.guid),
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('meterData', [value])
        }
      },
      () => Promise.resolve(savedData)
    );

    expect(result.value).toBe(savedData);
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
    expect(store.meterData()).toEqual([savedData]);
    expect(store.committedRevision()).toEqual({ accountGuid: 'account-a', revision: 1 });
    expect(store.hasPending()).toBe(false);
  });

  it('reloads by default when an add command returns a workspace record', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    const savedPredictorData = {
      id: 3,
      guid: 'predictor-data-a',
      accountId: 'account-a',
      facilityId: 'facility-a',
      predictorId: 'predictor-a'
    } as any;

    await boundary.execute(
      makeOptions('predictorData', 'add', savedPredictorData.guid),
      () => Promise.resolve(savedPredictorData)
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
    expect(store.predictorData()).toEqual([]);
  });

  it('reloads by default when an update command returns a workspace record', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    const snapshot = publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');
    const updatedFacility = {
      ...snapshot.facilities[0],
      name: 'Updated Facility'
    } as any;

    await boundary.execute(
      makeOptions('facility', 'update', updatedFacility.guid),
      () => Promise.resolve(updatedFacility)
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
    expect(store.facilities()).toEqual(snapshot.facilities);
  });

  it('reloads by default when a delete command returns a numeric id', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    const snapshot = makeSnapshot('account-a');
    const report = { id: 7, guid: 'report-a', accountId: 'account-a' } as any;
    store.publish({ ...snapshot, facilityReports: [report] }, {});
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    await boundary.execute(
      makeOptions('facilityReport', 'delete', report.guid),
      () => Promise.resolve(report.id)
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
    expect(store.facilityReports()).toEqual([report]);
  });

  it('uses an explicit committed patch for delete commands when provided', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    const snapshot = makeSnapshot('account-a');
    const report = { id: 7, guid: 'report-a', accountId: 'account-a' } as any;
    store.publish({ ...snapshot, facilityReports: [report] }, {});

    await boundary.execute(
      {
        ...makeOptions('facilityReport', 'delete', report.guid),
        publication: {
          mode: 'patch',
          buildPatch: () => deleteWorkspaceRecords('facilityReports', { ids: [report.id] })
        }
      },
      () => Promise.resolve(report.id)
    );

    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
    expect(store.facilityReports()).toEqual([]);
  });

  it('reloads by default for account updates', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    const snapshot = publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');
    const updatedAccount = {
      ...snapshot.account,
      name: 'Renamed Account'
    } as any;

    await boundary.execute(
      makeOptions('account', 'update', updatedAccount.guid),
      () => Promise.resolve(updatedAccount)
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
    expect(store.account()).toEqual(snapshot.account);
  });

  it('reloads by default for bulk commands and ambiguous result shapes', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    await boundary.execute(
      makeOptions('meterData', 'bulk'),
      () => Promise.resolve({ count: 2 })
    );
    await boundary.execute(
      makeOptions('facility', 'add'),
      () => Promise.resolve({ facility: { id: 1, guid: 'facility-a', accountId: 'account-a' } })
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledTimes(2);
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenNthCalledWith(1, true);
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenNthCalledWith(2, true);
  });

  it('reloads by default for account and facility delete commands', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    await boundary.execute(
      makeOptions('account', 'delete', 'account-a'),
      () => Promise.resolve(1)
    );
    await boundary.execute(
      makeOptions('facility', 'delete', 'facility-a'),
      () => Promise.resolve(2)
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledTimes(2);
  });

  it('falls back to a committed reload when patch publication fails', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    const foreignData = {
      id: 1,
      guid: 'data-a',
      accountId: 'account-b',
      facilityId: 'facility-a',
      meterId: 'meter-a'
    } as any;

    await boundary.execute(
      {
        ...makeOptions('meterData', 'add', foreignData.guid),
        publication: {
          mode: 'patch',
          buildPatch: value => upsertWorkspaceRecords('meterData', [value])
        }
      },
      () => Promise.resolve(foreignData)
    );

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
    expect(store.hasPending()).toBe(false);
  });

  it('emits no committed-change event when a command fails', async () => {
    const { boundary, store } = createBoundary();
    publishReady(store);

    const changes: unknown[] = [];
    boundary.committedChange$.subscribe(c => changes.push(c));

    await boundary.execute(makeOptions(), () => Promise.reject(new Error('fail'))).catch(() => undefined);

    expect(changes).toHaveLength(0);
  });

  it('executes queued commands in submission order', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    const order: number[] = [];
    const d1 = deferred<string>();
    const d2 = deferred<string>();

    const p1 = boundary.execute(makeOptions(), async () => { await d1.promise; order.push(1); return '1'; });
    const p2 = boundary.execute(makeOptions(), async () => { order.push(2); return '2'; });

    d2.resolve('ignored');
    d1.resolve('first');
    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
  });

  it('rejects a command that was queued for a stale account', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    const d = deferred<string>();
    // Submit while account-a is active, but switch away before it executes.
    const persist = vi.fn(() => d.promise);
    const p = boundary.execute(makeOptions(), persist);

    // Switch the workspace to a different account before resolving the first command.
    store.publish(makeSnapshot('account-b'), {});

    d.resolve('value');
    await expect(p).rejects.toMatchObject({ code: 'stale-workspace', persistenceCommitted: false });
    expect(persist).not.toHaveBeenCalled();
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
    expect(store.hasPending()).toBe(false);
  });

  it('reports a committed write when the account changes during persistence', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    const committed = vi.fn(); boundary.committedChange$.subscribe(committed);
    const persist = vi.fn(async () => {
      store.publish(makeSnapshot('account-b'), {});
      return 'saved';
    });

    await expect(boundary.execute(makeOptions(), persist)).rejects.toMatchObject({
      code: 'stale-workspace',
      message: 'Command was submitted for account account-a but the active account is now account-b after persistence.',
      persistenceCommitted: true
    });

    expect(persist).toHaveBeenCalledOnce();
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
    expect(committed).not.toHaveBeenCalled();
    expect(store.hasPending()).toBe(false);
  });

  it('rejects a command when the committed reload is superseded', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('superseded');

    const changes: unknown[] = [];
    boundary.committedChange$.subscribe(c => changes.push(c));

    await expect(
      boundary.execute(makeOptions(), () => Promise.resolve('value'))
    ).rejects.toMatchObject({ code: 'stale-workspace', persistenceCommitted: true });

    expect(changes).toHaveLength(0);
    expect(store.hasPending()).toBe(false);
  });

  it('reports a committed write when a reload publishes a different account', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockImplementation(async () => {
      store.publish(makeSnapshot('account-b'), {});
      return 'published';
    });
    const committed = vi.fn(); boundary.committedChange$.subscribe(committed);

    await expect(boundary.execute(makeOptions(), async () => 'saved')).rejects.toMatchObject({
      code: 'stale-workspace',
      message: 'Command was submitted for account account-a but the active account is now account-b after reload.',
      persistenceCommitted: true
    });

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledExactlyOnceWith(true);
    expect(committed).not.toHaveBeenCalled();
    expect(store.hasPending()).toBe(false);
  });

  it('accepts a command for the new account after an account switch', async () => {
    const { boundary, store, workspaceService } = createBoundary();
    publishReady(store);
    workspaceService.reloadActiveWorkspace.mockResolvedValue('published');

    store.publish(makeSnapshot('account-b'), {});
    const result = await boundary.execute(makeOptions(), () => Promise.resolve('new'));

    expect(result.value).toBe('new');
    expect(result.change.accountGuid).toBe('account-b');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createBoundary() {
  const store = new AccountWorkspaceStore();
  const workspaceService = {
    reloadActiveWorkspace: vi.fn().mockResolvedValue('published' as 'published' | 'superseded')
  };
  const boundary = new WorkspaceCommandBoundary(store, workspaceService as any);
  return { boundary, store, workspaceService };
}

function publishReady(store: AccountWorkspaceStore, accountGuid = 'account-a'): AccountWorkspaceSnapshot {
  const snapshot = makeSnapshot(accountGuid);
  store.publish(snapshot, {});
  return snapshot;
}

function makeSnapshot(accountGuid: string): AccountWorkspaceSnapshot {
  return {
    account: { id: 1, guid: accountGuid, name: 'Test Account' } as any,
    facilities: [
      { id: 1, guid: 'facility-a', accountId: accountGuid, name: 'Facility A' },
      { id: 2, guid: 'facility-b', accountId: accountGuid, name: 'Facility B' }
    ] as any,
    meters: [],
    meterData: [],
    meterGroups: [],
    predictors: [],
    predictorData: [],
    facilityAnalyses: [],
    accountAnalyses: [],
    accountReports: [],
    facilityReports: [],
    customEmissions: [],
    customFuels: [],
    customGWPs: [],
    energyUseGroups: [],
    energyUseEquipment: [], savedVisualizations: []
  };
}

function makeOptions(
  entityKind: WorkspaceEntityKind = 'meter',
  changeKind: WorkspaceChangeKind = 'update',
  entityGuid?: string
) {
  return { entityKind, changeKind, entityGuid, label: 'Saving' };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
