import { vi } from 'vitest';
import { IdbAccount } from '../models/idbModels/account';
import { CascadeDeletionProgress } from './indexed-db-cascade-delete.service';
import { DeleteDataService } from './delete-data.service';

describe('DeleteDataService', () => {
  const accountA = {
    id: 1,
    guid: 'account-a',
    name: 'Account A',
    deleteAccount: true
  } as IdbAccount;
  const accountB = {
    id: 2,
    guid: 'account-b',
    name: 'Account B',
    deleteAccount: false
  } as IdbAccount;

  function deferred<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve: resolve!, reject: reject! };
  }

  function setup(deleteAccount = vi.fn().mockResolvedValue(undefined)) {
    const cascadeDeleteService = { deleteAccount };
    const applicationLifecycle = { refreshAccountCatalog: vi.fn().mockResolvedValue([accountB]) };
    const workspaceService = { clear: vi.fn() };
    const workspaceStore = { account: vi.fn().mockReturnValue(accountA) };
    const service = new DeleteDataService(
      cascadeDeleteService as any,
      applicationLifecycle as any,
      workspaceService as any,
      workspaceStore as any
    );
    return { service, applicationLifecycle, workspaceService, workspaceStore, cascadeDeleteService };
  }

  it('publishes the retained accounts only after the transaction completes', async () => {
    const transaction = deferred<void>();
    const deleteAccount = vi.fn(() => transaction.promise);
    const { service, applicationLifecycle, workspaceService } = setup(deleteAccount);

    const deletion = service.setAccountToDelete([accountA]);
    await Promise.resolve();

    expect(deleteAccount).toHaveBeenCalledWith(accountA, expect.any(Function));
    expect(applicationLifecycle.refreshAccountCatalog).not.toHaveBeenCalled();
    expect(service.isDeleting.getValue()).toBe(true);

    transaction.resolve();
    await deletion;

    expect(applicationLifecycle.refreshAccountCatalog).toHaveBeenCalledOnce();
    expect(workspaceService.clear).toHaveBeenCalledOnce();
    expect(service.accountToDelete).toBeUndefined();
    expect(service.isDeleting.getValue()).toBe(false);
  });

  it('retains catalog and workspace state after rollback and reruns the whole transaction on retry', async () => {
    let attempt = 0;
    const deleteAccount = vi.fn(async (_account: IdbAccount, onProgress: CascadeDeletionProgress) => {
      attempt++;
      onProgress({
        index: 5,
        total: 18,
        storeName: 'utilityMeter',
        message: 'Deleting Meters'
      });
      if (attempt === 1) {
        throw new Error('Injected transaction failure');
      }
    });
    const { service, applicationLifecycle, workspaceService } = setup(deleteAccount);

    await service.setAccountToDelete([accountA]);

    expect(applicationLifecycle.refreshAccountCatalog).not.toHaveBeenCalled();
    expect(workspaceService.clear).not.toHaveBeenCalled();
    expect(service.accountToDelete).toBe(accountA);
    expect(service.isDeleting.getValue()).toBe(true);
    expect(service.deletionError.getValue()).toMatchObject({
      accountGuid: accountA.guid,
      storeName: 'utilityMeter'
    });

    await service.retryDelete();

    expect(deleteAccount).toHaveBeenCalledTimes(2);
    expect(applicationLifecycle.refreshAccountCatalog).toHaveBeenCalledOnce();
    expect(workspaceService.clear).toHaveBeenCalledOnce();
    expect(service.deletionError.getValue()).toBeUndefined();
    expect(service.isDeleting.getValue()).toBe(false);
  });

  it('holds a queued deletion until every nested suspension is resumed', async () => {
    const { service, applicationLifecycle, cascadeDeleteService } = setup();
    service.suspendQueuedDeletion();
    service.suspendQueuedDeletion();

    await service.setAccountToDelete([accountA]);

    expect(cascadeDeleteService.deleteAccount).not.toHaveBeenCalled();
    expect(applicationLifecycle.refreshAccountCatalog).not.toHaveBeenCalled();
    expect(service.accountToDelete).toBe(accountA);

    await service.resumeQueuedDeletion();

    expect(cascadeDeleteService.deleteAccount).not.toHaveBeenCalled();
    expect(applicationLifecycle.refreshAccountCatalog).not.toHaveBeenCalled();

    await service.resumeQueuedDeletion();

    expect(cascadeDeleteService.deleteAccount).toHaveBeenCalledOnce();
    expect(applicationLifecycle.refreshAccountCatalog).toHaveBeenCalledOnce();
  });

  it('does not clear the active workspace when deleting an inactive account', async () => {
    const { service, workspaceService, workspaceStore } = setup();
    workspaceStore.account.mockReturnValue(accountB);

    await service.setAccountToDelete([accountA]);

    expect(workspaceService.clear).not.toHaveBeenCalled();
  });
});
