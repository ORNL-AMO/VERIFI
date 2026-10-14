import { Injectable, inject } from '@angular/core';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { applyDataValidationSettings, DataValidationSettingsChange } from '@shared/settings-forms/data-validation-settings';
import { WorkspaceWriteError } from '../workspace-commands.models';

/** Atomically mirrors a single-facility data quality edit to its owning account. */
@Injectable({ providedIn: 'root' })
export class DataValidationSettingsCommandHandler {
  private readonly transactions = inject(IndexedDbTransactionService);

  async updateSingleFacility(account: IdbAccount, facility: IdbFacility, change: DataValidationSettingsChange, activeAccountGuid: string): Promise<{ account: IdbAccount; facility: IdbFacility }> {
    if (account.guid !== activeAccountGuid || facility.accountId !== activeAccountGuid) {
      throw new WorkspaceWriteError('cross-account-entity', 'The settings do not belong to the active account.');
    }
    if (!account.isSingleFacilityCompany || account.id === undefined || facility.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'A persisted single-facility account is required.');
    }
    return this.transactions.runTransaction(['accounts', 'facilities'], 'readwrite', async transaction => {
      const currentAccount = await transaction.get<IdbAccount>('accounts', account.id);
      const currentFacility = await transaction.get<IdbFacility>('facilities', facility.id);
      if (currentAccount?.guid !== account.guid || !currentAccount.isSingleFacilityCompany
        || currentFacility?.guid !== facility.guid || currentFacility.accountId !== account.guid) {
        throw new WorkspaceWriteError('stale-workspace', 'The account or facility changed. Reload settings and try again.');
      }
      const updatedAccount = applyDataValidationSettings(currentAccount, change, true);
      const updatedFacility = applyDataValidationSettings(currentFacility, change);
      const modifiedDate = new Date();
      updatedAccount.modifiedDate = modifiedDate;
      updatedFacility.modifiedDate = modifiedDate;
      await transaction.put('accounts', updatedAccount);
      await transaction.put('facilities', updatedFacility);
      return { account: updatedAccount, facility: updatedFacility };
    });
  }
}
