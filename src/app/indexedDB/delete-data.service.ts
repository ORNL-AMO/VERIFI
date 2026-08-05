import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { IdbAccount } from '../models/idbModels/account';
import { AccountdbService } from './account-db.service';
import { IndexedDbCascadeDeleteService } from './indexed-db-cascade-delete.service';
import { VerifiStoreName } from './indexed-db-schema';

export interface AccountDeletionError {
  accountGuid: string;
  storeName: VerifiStoreName;
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
  deletionError: BehaviorSubject<AccountDeletionError> = new BehaviorSubject(undefined);

  accountToDelete: IdbAccount;
  private activeDeletion: Promise<void>;
  private activeStoreName: VerifiStoreName = 'accounts';
  private deletionSuspensionCount = 0;

  constructor(
    private accountDbService: AccountdbService,
    private cascadeDeleteService: IndexedDbCascadeDeleteService
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
    if (!this.accountToDelete || this.deletionSuspensionCount > 0) {
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
    await this.gatherAndDelete();
  }

  suspendQueuedDeletion(): void {
    this.deletionSuspensionCount++;
  }

  async resumeQueuedDeletion(): Promise<void> {
    if (this.deletionSuspensionCount > 0) {
      this.deletionSuspensionCount--;
    }
    if (this.deletionSuspensionCount === 0) {
      await this.gatherAndDelete();
    }
  }

  private async deleteAccountData(account: IdbAccount): Promise<void> {
    this.isDeleting.next(true);
    this.deletionError.next(undefined);

    try {
      await this.cascadeDeleteService.deleteAccount(account, phase => {
        this.activeStoreName = phase.storeName;
        this.setDeletingMessage(phase.index, phase.total, phase.message);
      });
      const allAccounts = await firstValueFrom(this.accountDbService.getAll());
      this.resetDeletionState(allAccounts);
    } catch (error) {
      this.deletionError.next({
        accountGuid: account.guid,
        storeName: this.activeStoreName,
        message: `Account deletion rolled back while processing ${this.activeStoreName}. Retry to try again.`,
        cause: error
      });
    }
  }

  private resetDeletionState(allAccounts: Array<IdbAccount>): void {
    this.deletingMessaging.next(undefined);
    this.deletionError.next(undefined);
    this.isDeleting.next(false);
    this.accountToDelete = undefined;
    this.accountDbService.allAccounts.next(allAccounts);
  }
}
