import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { IdbAccount } from '../models/idbModels/account';
import { ACCOUNT_DELETION_STORES, ACCOUNT_ROOT_STORE } from './account-deletion.config';
import { DeleteDataService } from './delete-data.service';

interface TestRecord {
  id?: number;
  accountId?: string | number;
  guid?: string;
  deleteAccount?: boolean;
}

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

  function setup(failingStore?: string) {
    const stores: Record<string, Array<TestRecord>> = {
      accounts: [accountA, accountB]
    };
    for (const { storeName } of ACCOUNT_DELETION_STORES) {
      stores[storeName] = [
        { id: 101, accountId: accountA.guid },
        { id: 201, accountId: accountB.guid }
      ];
    }
    stores.facilities.push({ id: 301, accountId: accountA.id });

    let failNextDelete = Boolean(failingStore);
    const dbService = {
      getAll: vi.fn((storeName: string): Observable<Array<TestRecord>> => {
        return of([...stores[storeName]]);
      }),
      delete: vi.fn((storeName: string, id: number): Observable<boolean> => {
        if (failNextDelete && storeName === failingStore) {
          failNextDelete = false;
          return throwError(() => new Error('Injected deletion failure'));
        }
        stores[storeName] = stores[storeName].filter(record => record.id !== id);
        return of(true);
      })
    };
    const accountDbService = {
      allAccounts: new BehaviorSubject<Array<IdbAccount>>([accountA, accountB]),
      getAll: vi.fn(() => of(stores.accounts as Array<IdbAccount>)),
      updateWithObservable: vi.fn((account: IdbAccount) => of(account))
    };
    const service = new DeleteDataService(accountDbService as any, dbService as any);

    return { service, stores, dbService, accountDbService };
  }

  it('deletes every GUID-owned child before deleting the account root', async () => {
    const { service, stores, dbService, accountDbService } = setup();

    await service.setAccountToDelete([accountA]);

    for (const { storeName } of ACCOUNT_DELETION_STORES) {
      expect(stores[storeName].filter(record => record.accountId === accountA.guid)).toEqual([]);
      expect(stores[storeName]).toContainEqual({ id: 201, accountId: accountB.guid });
    }
    expect(stores.facilities).toContainEqual({ id: 301, accountId: accountA.id });
    expect(stores.accounts).toEqual([accountB]);
    expect(service.accountToDelete).toBeUndefined();
    expect(service.isDeleting.getValue()).toBe(false);
    expect(service.deletionError.getValue()).toBeUndefined();
    expect(accountDbService.allAccounts.getValue()).toEqual([accountB]);

    const deleteCalls = dbService.delete.mock.calls;
    expect(deleteCalls[deleteCalls.length - 1]).toEqual([ACCOUNT_ROOT_STORE, accountA.id]);
  });

  it('retains the marked account after failure and completes cleanup on retry', async () => {
    const { service, stores, dbService, accountDbService } = setup('utilityMeter');

    await service.setAccountToDelete([accountA]);

    expect(stores.accounts).toContain(accountA);
    expect(accountA.deleteAccount).toBe(true);
    expect(service.accountToDelete).toBe(accountA);
    expect(service.isDeleting.getValue()).toBe(true);
    expect(service.pauseDelete.getValue()).toBe(true);
    expect(service.deletionError.getValue()).toMatchObject({
      accountGuid: accountA.guid,
      storeName: 'utilityMeter'
    });
    expect(dbService.delete).not.toHaveBeenCalledWith(ACCOUNT_ROOT_STORE, accountA.id);
    expect(accountDbService.allAccounts.getValue()).toEqual([accountA, accountB]);

    await service.retryDelete();

    for (const { storeName } of ACCOUNT_DELETION_STORES) {
      expect(stores[storeName].filter(record => record.accountId === accountA.guid)).toEqual([]);
    }
    expect(stores.accounts).toEqual([accountB]);
    expect(service.accountToDelete).toBeUndefined();
    expect(service.deletionError.getValue()).toBeUndefined();
    expect(service.isDeleting.getValue()).toBe(false);
  });
});
