import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { IdbAccount } from '../models/idbModels/account';
import {
  ACCOUNT_DELETION_STORES,
  ACCOUNT_ROOT_STORE,
  AccountDeletionStoreDefinition
} from './account-deletion.config';
import { AccountdbService } from './account-db.service';

interface AccountOwnedRecord {
  id?: number;
  accountId?: string;
}

export interface AccountDeletionError {
  accountGuid: string;
  storeName: string;
  message: string;
  cause: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class DeleteDataService {

  isDeleting: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  deletingMessaging: BehaviorSubject<{
    index: number,
    totalCount: number,
    message: string,
    percent: number
  }> = new BehaviorSubject(undefined);
  pauseDelete: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  deletionError: BehaviorSubject<AccountDeletionError> = new BehaviorSubject(undefined);

  accountToDelete: IdbAccount;
  private activeDeletion: Promise<void>;
  private activeStoreName: string;

  constructor(
    private accountDbService: AccountdbService,
    private dbService: NgxIndexedDBService
  ) { }

  setDeletingMessage(index: number, totalCount: number, message: string) {
    this.deletingMessaging.next({
      index,
      totalCount,
      message,
      percent: totalCount === 0 ? 100 : (index / totalCount) * 100
    });
  }

  async setAccountToDelete(allDeleteAccounts: Array<IdbAccount>): Promise<void> {
    if (this.activeDeletion) {
      await this.activeDeletion;
    }
    if (allDeleteAccounts.length > 0 && !this.accountToDelete) {
      this.accountToDelete = allDeleteAccounts[0];
      await this.gatherAndDelete();
    }
  }

  async gatherAndDelete(): Promise<void> {
    if (!this.accountToDelete || this.pauseDelete.getValue()) {
      return;
    }
    if (this.activeDeletion) {
      return this.activeDeletion;
    }

    const account = this.accountToDelete;
    this.activeDeletion = this.deleteAccountData(account);
    try {
      await this.activeDeletion;
    } finally {
      this.activeDeletion = undefined;
    }
  }

  async retryDelete(): Promise<void> {
    if (this.activeDeletion) {
      await this.activeDeletion;
    }
    this.deletionError.next(undefined);
    this.pauseDelete.next(false);
    await this.gatherAndDelete();
  }

  async cancelDelete(): Promise<void> {
    if (!this.accountToDelete) {
      return;
    }
    const account = this.accountToDelete;
    if (this.activeDeletion) {
      await this.activeDeletion;
    }
    if (this.accountToDelete !== account) {
      return;
    }

    account.deleteAccount = false;
    await firstValueFrom(this.accountDbService.updateWithObservable(account));
    const allAccounts = await firstValueFrom(this.accountDbService.getAll());
    this.resetDeletionState(allAccounts);
  }

  private async deleteAccountData(account: IdbAccount): Promise<void> {
    this.isDeleting.next(true);
    this.deletionError.next(undefined);

    try {
      for (const storeDefinition of ACCOUNT_DELETION_STORES) {
        if (this.pauseDelete.getValue()) {
          return;
        }
        await this.deleteAccountRecords(account, storeDefinition);
      }

      if (this.pauseDelete.getValue()) {
        return;
      }

      this.activeStoreName = ACCOUNT_ROOT_STORE;
      this.setDeletingMessage(1, 1, 'Finishing Account Deletion');
      if (account.id === undefined) {
        throw new Error('The account does not have a local IndexedDB key.');
      }
      const allAccounts = await firstValueFrom(this.accountDbService.getAll());
      await firstValueFrom(this.dbService.delete(ACCOUNT_ROOT_STORE, account.id));
      this.resetDeletionState(
        allAccounts.filter(existingAccount => existingAccount.id !== account.id)
      );
    } catch (error) {
      this.pauseDelete.next(true);
      this.deletionError.next({
        accountGuid: account.guid,
        storeName: this.activeStoreName,
        message: `Account deletion stopped while processing ${this.activeStoreName}. Retry to continue cleanup.`,
        cause: error
      });
    }
  }

  private async deleteAccountRecords(
    account: IdbAccount,
    storeDefinition: AccountDeletionStoreDefinition
  ): Promise<void> {
    this.activeStoreName = storeDefinition.storeName;
    this.setDeletingMessage(1, 1, storeDefinition.message);
    const allRecords = await firstValueFrom(
      this.dbService.getAll<AccountOwnedRecord>(storeDefinition.storeName)
    );
    const accountRecords = allRecords.filter(record => record.accountId === account.guid);

    if (accountRecords.length === 0) {
      this.setDeletingMessage(1, 1, storeDefinition.message);
      return;
    }

    for (let index = 0; index < accountRecords.length; index++) {
      if (this.pauseDelete.getValue()) {
        return;
      }
      const record = accountRecords[index];
      if (record.id === undefined) {
        throw new Error(`A record in ${storeDefinition.storeName} does not have a local IndexedDB key.`);
      }
      this.setDeletingMessage(index + 1, accountRecords.length, storeDefinition.message);
      await firstValueFrom(this.dbService.delete(storeDefinition.storeName, record.id));
    }
  }

  private resetDeletionState(allAccounts: Array<IdbAccount>): void {
    this.deletingMessaging.next(undefined);
    this.deletionError.next(undefined);
    this.pauseDelete.next(false);
    this.isDeleting.next(false);
    this.accountToDelete = undefined;
    this.accountDbService.allAccounts.next(allAccounts);
  }
}
