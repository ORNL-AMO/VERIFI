import { Injectable } from '@angular/core';
import { IdbAccount } from '../models/idbModels/account';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IdbFacility } from '../models/idbModels/facility';
import {
  ACCOUNT_DELETION_STORES,
  ACCOUNT_ROOT_STORE
} from './account-deletion.config';
import { VerifiStoreName } from './indexed-db-schema';
import { IndexedDbTransactionService } from './indexed-db-transaction.service';
import {
  FACILITY_DELETION_CHILD_STORES,
  FACILITY_DELETION_PARTICIPANT_STORES,
  FACILITY_REFERENCE_STORES,
  FACILITY_ROOT_STORE
} from './facility-deletion.config';
import {
  removeFacilityFromAccountAnalysis,
  removeFacilityFromAccountReport
} from './facility-deletion-references';

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

  async deleteFacility(
    facility: IdbFacility,
    accountGuid: string,
    onProgress?: CascadeDeletionProgress
  ): Promise<void> {
    if (facility.id === undefined) {
      throw new Error('The facility does not have a local IndexedDB key.');
    }

    const totalPhases = FACILITY_DELETION_CHILD_STORES.length
      + FACILITY_REFERENCE_STORES.length + 1;
    const modifiedDate = new Date();

    await this.transactionService.runTransaction(
      FACILITY_DELETION_PARTICIPANT_STORES,
      'readwrite',
      async transaction => {
        for (let index = 0; index < FACILITY_DELETION_CHILD_STORES.length; index++) {
          const storeDefinition = FACILITY_DELETION_CHILD_STORES[index];
          onProgress?.({
            index: index + 1,
            total: totalPhases,
            storeName: storeDefinition.storeName,
            message: storeDefinition.message
          });
          await transaction.deleteAllByIndex(
            storeDefinition.storeName,
            'facilityId',
            facility.guid
          );
        }

        const accountReportPhase = FACILITY_DELETION_CHILD_STORES.length + 1;
        onProgress?.({
          index: accountReportPhase,
          total: totalPhases,
          storeName: 'accountReports',
          message: FACILITY_REFERENCE_STORES[0].message
        });
        const accountReports = await transaction.getAllByIndex<IdbAccountReport>(
          'accountReports',
          'accountId',
          accountGuid
        );
        for (const report of accountReports) {
          await transaction.put(
            'accountReports',
            removeFacilityFromAccountReport(report, facility.guid, modifiedDate)
          );
        }

        const accountAnalysisPhase = accountReportPhase + 1;
        onProgress?.({
          index: accountAnalysisPhase,
          total: totalPhases,
          storeName: 'accountAnalysisItems',
          message: FACILITY_REFERENCE_STORES[1].message
        });
        const accountAnalysisItems = await transaction.getAllByIndex<IdbAccountAnalysisItem>(
          'accountAnalysisItems',
          'accountId',
          accountGuid
        );
        for (const analysisItem of accountAnalysisItems) {
          await transaction.put(
            'accountAnalysisItems',
            removeFacilityFromAccountAnalysis(analysisItem, facility.guid, modifiedDate)
          );
        }

        onProgress?.({
          index: totalPhases,
          total: totalPhases,
          storeName: FACILITY_ROOT_STORE,
          message: 'Deleting Facility'
        });
        await transaction.deleteByKey(FACILITY_ROOT_STORE, facility.id as number);
      }
    );
  }
}
