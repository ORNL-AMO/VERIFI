import { Injectable } from '@angular/core';
import { IdbAccount } from '../models/idbModels/account';
import {
  ACCOUNT_DELETION_STORES,
  ACCOUNT_ROOT_STORE
} from './account-deletion.config';
import { VerifiStoreName } from './indexed-db-schema';
import { IndexedDbTransactionService } from './indexed-db-transaction.service';

export interface CascadeDeletionPhase {
  index: number;
  total: number;
  storeName: VerifiStoreName;
  message: string;
}

export type CascadeDeletionProgress = (phase: CascadeDeletionPhase) => void;

@Injectable({
  providedIn: 'root'
})
export class IndexedDbCascadeDeleteService {

  constructor(private transactionService: IndexedDbTransactionService) { }

  async deleteAccount(
    account: IdbAccount,
    onProgress?: CascadeDeletionProgress
  ): Promise<void> {
    if (account.id === undefined) {
      throw new Error('The account does not have a local IndexedDB key.');
    }

    const childStores = ACCOUNT_DELETION_STORES.map(storeDefinition => storeDefinition.storeName);
    const stores = [ACCOUNT_ROOT_STORE, ...childStores];
    const totalPhases = ACCOUNT_DELETION_STORES.length + 1;

    await this.transactionService.runTransaction(stores, 'readwrite', async transaction => {
      for (let index = 0; index < ACCOUNT_DELETION_STORES.length; index++) {
        const storeDefinition = ACCOUNT_DELETION_STORES[index];
        onProgress?.({
          index: index + 1,
          total: totalPhases,
          storeName: storeDefinition.storeName,
          message: storeDefinition.message
        });
        await transaction.deleteAllByIndex(
          storeDefinition.storeName,
          'accountId',
          account.guid
        );
      }

      onProgress?.({
        index: totalPhases,
        total: totalPhases,
        storeName: ACCOUNT_ROOT_STORE,
        message: 'Finishing Account Deletion'
      });
      await transaction.deleteByKey(ACCOUNT_ROOT_STORE, account.id as number);
    });
  }
}
