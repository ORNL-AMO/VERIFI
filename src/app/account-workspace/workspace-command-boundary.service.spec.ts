import { vi } from 'vitest';
import { AccountWorkspaceStore } from './account-workspace.store';
import { AccountWorkspaceSnapshot } from './account-workspace.models';
import { WorkspaceCommandBoundary } from './workspace-command-boundary.service';
import { WorkspaceWriteError } from './workspace-commands.models';

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
    facilities: [],
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
  entityKind = 'meter' as const,
  changeKind = 'update' as const,
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
