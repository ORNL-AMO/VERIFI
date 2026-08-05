import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from '../indexedDB/account-analysis-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { AccountReportDbService } from '../indexedDB/account-report-db.service';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { CustomEmissionsDbService } from '../indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from '../indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from '../indexedDB/custom-gwp-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from '../indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from '../indexedDB/facility-energy-use-groups-db.service';
import { FacilityReportsDbService } from '../indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from '../indexedDB/predictor-data-db.service';
import { PredictorDbService } from '../indexedDB/predictor-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { AccountWorkspaceSnapshot, WorkspaceError } from './account-workspace.models';

export class AccountWorkspaceLoadError extends Error {
  constructor(readonly workspaceError: WorkspaceError) {
    super(workspaceError.message);
    this.name = 'AccountWorkspaceLoadError';
  }
}

@Injectable({ providedIn: 'root' })
export class AccountWorkspaceLoaderService {
  constructor(
    private accountRepository: AccountdbService,
    private facilityRepository: FacilitydbService,
    private meterRepository: UtilityMeterdbService,
    private meterDataRepository: UtilityMeterDatadbService,
    private meterGroupRepository: UtilityMeterGroupdbService,
    private predictorRepository: PredictorDbService,
    private predictorDataRepository: PredictorDataDbService,
    private facilityAnalysisRepository: AnalysisDbService,
    private accountAnalysisRepository: AccountAnalysisDbService,
    private accountReportRepository: AccountReportDbService,
    private facilityReportRepository: FacilityReportsDbService,
    private customEmissionsRepository: CustomEmissionsDbService,
    private customFuelRepository: CustomFuelDbService,
    private customGwpRepository: CustomGWPDbService,
    private energyUseGroupRepository: FacilityEnergyUseGroupsDbService,
    private energyUseEquipmentRepository: FacilityEnergyUseEquipmentDbService
  ) { }

  async load(accountGuid: string): Promise<AccountWorkspaceSnapshot> {
    const account = await this.accountRepository.getStoredByGuid(accountGuid);
    if (!account || account.deleteAccount) {
      throw new AccountWorkspaceLoadError({
        code: 'account-not-found',
        accountGuid,
        message: 'The requested account could not be found.'
      });
    }

    try {
      const [
        facilities,
        meters,
        meterData,
        meterGroups,
        predictors,
        predictorData,
        facilityAnalyses,
        accountAnalyses,
        accountReports,
        facilityReports,
        customEmissions,
        customFuels,
        customGWPs,
        energyUseGroups,
        energyUseEquipment
      ] = await Promise.all([
        this.facilityRepository.getAllAccountFacilities(accountGuid),
        this.meterRepository.getAllAccountMeters(accountGuid),
        this.meterDataRepository.getAllAccountMeterData(accountGuid),
        this.meterGroupRepository.getAllAccountMeterGroups(accountGuid),
        this.predictorRepository.getAllAccountPredictors(accountGuid),
        this.predictorDataRepository.getAllAccountPredictorData(accountGuid),
        this.facilityAnalysisRepository.getAllAccountAnalysisItems(accountGuid),
        this.accountAnalysisRepository.getAllAccountAnalysisItems(accountGuid),
        this.accountReportRepository.getAllAccountReports(accountGuid),
        this.facilityReportRepository.getAllFacilityReportsByAccountId(accountGuid),
        this.customEmissionsRepository.getAllAccountCustomEmissions(accountGuid),
        this.customFuelRepository.getAllAccountCustomFuels(accountGuid),
        this.customGwpRepository.getAllAccountCustomGWP(accountGuid),
        this.energyUseGroupRepository.getAllAccountEnergyUseGroups(accountGuid),
        this.energyUseEquipmentRepository.getAllAccountEnergyUseEquipment(accountGuid)
      ]);

      const collections = {
        facilities,
        meters,
        meterData,
        meterGroups,
        predictors,
        predictorData,
        facilityAnalyses,
        accountAnalyses,
        accountReports,
        facilityReports,
        customEmissions,
        customFuels,
        customGWPs,
        energyUseGroups,
        energyUseEquipment
      };
      validateAccountOwnership(accountGuid, collections);

      return {
        account,
        facilities: sortByLocalId(facilities),
        meters: sortByLocalId(meters),
        meterData: sortByLocalId(meterData),
        meterGroups: sortByLocalId(meterGroups),
        predictors: sortByLocalId(predictors),
        predictorData: sortByLocalId(predictorData),
        facilityAnalyses: sortByLocalId(facilityAnalyses),
        accountAnalyses: sortByLocalId(accountAnalyses),
        accountReports: sortByLocalId(accountReports),
        facilityReports: sortByLocalId(facilityReports),
        customEmissions: sortByLocalId(customEmissions),
        customFuels: sortByLocalId(customFuels),
        customGWPs: sortByLocalId(customGWPs),
        energyUseGroups: sortByLocalId(energyUseGroups),
        energyUseEquipment: sortByLocalId(energyUseEquipment)
      };
    } catch (error) {
      if (error instanceof AccountWorkspaceLoadError) { throw error; }
      throw new AccountWorkspaceLoadError({
        code: 'load-failed',
        accountGuid,
        message: 'The account workspace could not be loaded.',
        cause: error
      });
    }
  }
}

function sortByLocalId<T extends { id?: number; guid?: string }>(items: readonly T[]): readonly T[] {
  return [...items].sort((first, second) => {
    const idResult = (first.id ?? Number.MAX_SAFE_INTEGER) - (second.id ?? Number.MAX_SAFE_INTEGER);
    return idResult || (first.guid ?? '').localeCompare(second.guid ?? '');
  });
}

function validateAccountOwnership(
  accountGuid: string,
  collections: Record<string, readonly { accountId?: string }[]>
): void {
  for (const [collectionName, records] of Object.entries(collections)) {
    if (records.some(record => record.accountId !== accountGuid)) {
      throw new AccountWorkspaceLoadError({
        code: 'invalid-account-data',
        accountGuid,
        message: `The ${collectionName} query returned data belonging to another account.`
      });
    }
  }
}
