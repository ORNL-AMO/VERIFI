import { Injectable, inject } from '@angular/core';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { applyAccountSettingsChange, applyFacilitySettingsChange, FacilitySettingsChange } from '../facility-settings.models';
import { WorkspaceWriteError } from '../workspace-commands.models';

export interface SingleFacilitySettingsResult {
  readonly account: IdbAccount;
  readonly facility: IdbFacility;
}

/** Persists one mirrored settings group without replacing unrelated durable values. */
@Injectable({ providedIn: 'root' })
export class SingleFacilitySettingsCommandHandler {
  private readonly transactions = inject(IndexedDbTransactionService);

  async update(
    account: Pick<IdbAccount, 'id' | 'guid'>,
    facility: Pick<IdbFacility, 'id' | 'guid' | 'accountId'>,
    change: FacilitySettingsChange,
    activeAccountGuid: string
  ): Promise<SingleFacilitySettingsResult> {
    if (account.guid !== activeAccountGuid || facility.accountId !== activeAccountGuid) {
      throw new WorkspaceWriteError('cross-account-entity', 'The settings do not belong to the active account.');
    }
    if (account.id === undefined || facility.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'A persisted account and facility are required.');
    }
    const submittedChange = structuredClone(change);
    return this.transactions.runTransaction(['accounts', 'facilities'], 'readwrite', async transaction => {
      const currentAccount = await transaction.get<IdbAccount>('accounts', account.id);
      const currentFacility = await transaction.get<IdbFacility>('facilities', facility.id);
      if (currentAccount?.guid !== account.guid || !currentAccount.isSingleFacilityCompany
        || currentFacility?.guid !== facility.guid || currentFacility.accountId !== account.guid) {
        throw new WorkspaceWriteError('stale-workspace', 'The account or facility changed. Reload settings and try again.');
      }
      const updatedAccount = applyAccountSettingsChange(currentAccount, submittedChange);
      const updatedFacility = applyFacilitySettingsChange(currentFacility, submittedChange);
      const modifiedDate = new Date();
      updatedAccount.modifiedDate = modifiedDate;
      updatedFacility.modifiedDate = modifiedDate;
      await transaction.put('accounts', updatedAccount);
      await transaction.put('facilities', updatedFacility);
      return { account: updatedAccount, facility: updatedFacility };
    });
  }
}
