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
      code: 'workspace-not-ready'
    });
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

  it('clears pending and wraps the error when persistence fails', async () => {
    const { boundary, store } = createBoundary();
    publishReady(store);

    const cause = new Error('db unavailable');
    await expect(
      boundary.execute(makeOptions(), () => Promise.reject(cause))
    ).rejects.toMatchObject({ code: 'persistence-failed', cause });

    expect(store.hasPending()).toBe(false);
  });

  it('re-throws a WorkspaceWriteError from persistence without double-wrapping', async () => {
    const { boundary, store } = createBoundary();
    publishReady(store);

    const original = new WorkspaceWriteError('validation-failed', 'bad input');
    const caught = await boundary.execute(makeOptions(), () => Promise.reject(original)).catch(e => e);

    expect(caught).toBe(original);
    expect(caught.code).toBe('validation-failed');
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
    const p = boundary.execute(makeOptions(), () => d.promise);

    // Switch the workspace to a different account before resolving the first command.
    store.publish(makeSnapshot('account-b'), {});

    d.resolve('value');
    await expect(p).rejects.toMatchObject({ code: 'stale-workspace' });
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
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
    ).rejects.toMatchObject({ code: 'stale-workspace' });

    expect(changes).toHaveLength(0);
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
    energyUseEquipment: []
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
