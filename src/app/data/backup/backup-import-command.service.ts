import { savedVisualizationFacilityGuid } from '@data/visualizations/saved-visualization-record';
import { accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { Injectable, signal } from '@angular/core';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { visualizationTransferMaps, mergeVisualizationTransferMaps, transferSavedVisualization, summarizeVisualizationImport, VisualizationImportSummary } from './visualization-backup';
import { VisualizationGuidMaps } from '@domain/visualizations/visualization-references';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { inspectVisualizationReferences, readVisualizationReferenceCatalog } from '@data/account-workspace/visualization-reference-inspection';
import { FACILITY_DELETION_CHILD_STORES, FACILITY_DELETION_PARTICIPANT_STORES } from '@data/indexedDB/facility-deletion.config';
import { removeFacilityFromAccountAnalysis, removeFacilityFromAccountReport } from '@data/indexedDB/facility-deletion-references';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';
import { JStatRegressionModel } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { BackupRelationshipError, PreparedBackupFile } from './backup-preparation.service';
import { GuidPair, remapStatusWarningDismissals } from './status-warning-dismissal-remap';
import { remapEnergyUseBackupReferences, unresolvedEnergyUseBackupReferences } from './energy-use-backup-relations';

interface PredictorGuidPair extends GuidPair {
  predictorName: string;
  facilityId: string;
}

const ACCOUNT_IMPORT_STORES: ReadonlyArray<VerifiStoreName> = [
  'accounts',
  'facilities',
  'utilityMeterGroups',
  'utilityMeter',
  'utilityMeterData',
  'predictor',
  'predictorData',
  'analysisItems',
  'accountAnalysisItems',
  'customEmissionsItems',
  'customFuels',
  'customGWP',
  'accountReports',
  'facilityReports',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment',
  'savedVisualizations'
];

const FACILITY_IMPORT_STORES: ReadonlyArray<VerifiStoreName> = [
  'facilities',
  'utilityMeterGroups',
  'utilityMeter',
  'utilityMeterData',
  'predictor',
  'predictorData',
  'analysisItems',
  'customEmissionsItems',
  'customFuels',
  'customGWP',
  'accountAnalysisItems',
  'accountReports',
  'facilityReports',
  'facilityEnergyUseGroups',
  'facilityEnergyUseEquipment',
  'savedVisualizations'
];

const FACILITY_RESTORE_STORES = dedupeStores(
  FACILITY_DELETION_PARTICIPANT_STORES,
  FACILITY_IMPORT_STORES
);

@Injectable({ providedIn: 'root' })
export class BackupImportCommandService {
  private readonly summary = signal<VisualizationImportSummary | undefined>(undefined);
  readonly visualizationImportSummary = this.summary.asReadonly();

  clearVisualizationImportSummary(): void { this.summary.set(undefined); }

  constructor(
    private readonly transactions: IndexedDbTransactionService,
    private readonly loadingService: LoadingService
  ) { }

  async importAccountBackupFile(preparedBackup: PreparedBackupFile, currIdx: number): Promise<IdbAccount> {
    const backupFile = structuredClone(preparedBackup);
    const visualizations: IdbSavedVisualization[] = [];
    this.summary.set(undefined);

    const result = await this.transactions.runTransaction(ACCOUNT_IMPORT_STORES, 'readwrite', async transaction => {
      await this.requireUnresolvedGroupsAvailable(transaction, backupFile);
      const accountGUIDs: GuidPair = {
        oldId: backupFile.account.guid,
        newId: this.getGUID()
      };
      delete backupFile.account.id;
      backupFile.account.guid = accountGUIDs.newId;
      const newAccountId = await this.addRecord(transaction, 'accounts', backupFile.account);
      const newAccount: IdbAccount = { ...backupFile.account, id: newAccountId };

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      const facilityGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.facilities.length; i++) {
        const facility: IdbFacility = backupFile.facilities[i];
        const newGUID: string = this.getGUID();
        facilityGUIDs.push({
          oldId: facility.guid,
          newId: newGUID
        });
        facility.guid = newGUID;
        delete facility.id;
        facility.accountId = accountGUIDs.newId;
        const newFacilityId = await this.addRecord(transaction, 'facilities', facility);
        backupFile.facilities[i] = { ...facility, id: newFacilityId };
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      const meterGroupGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.groups.length; i++) {
        const group: IdbUtilityMeterGroup = backupFile.groups[i];
        const newGUID: string = this.getGUID();
        meterGroupGUIDs.push({
          newId: newGUID,
          oldId: group.guid
        });
        delete group.id;
        group.accountId = accountGUIDs.newId;
        group.facilityId = this.getNewId(group.facilityId, facilityGUIDs);
        group.guid = newGUID;
        await this.addRecord(transaction, 'utilityMeterGroups', group);
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      const meterGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.meters.length; i++) {
        const meter: IdbUtilityMeter = backupFile.meters[i];
        const newGUID: string = this.getGUID();
        meterGUIDs.push({
          newId: newGUID,
          oldId: meter.guid
        });
        delete meter.id;
        meter.accountId = accountGUIDs.newId;
        meter.facilityId = this.getNewId(meter.facilityId, facilityGUIDs);
        meter.guid = newGUID;
        meter.groupId = this.getNewId(meter.groupId, meterGroupGUIDs);
        await this.addRecord(transaction, 'utilityMeter', meter);
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      for (let i = 0; i < backupFile.meterData.length; i++) {
        const meterData: IdbUtilityMeterData = backupFile.meterData[i];
        const newGUID: string = this.getGUID();
        delete meterData.id;
        meterData.guid = newGUID;
        meterData.accountId = accountGUIDs.newId;
        meterData.facilityId = this.getNewId(meterData.facilityId, facilityGUIDs);
        meterData.meterId = this.getNewId(meterData.meterId, meterGUIDs);
        await this.addRecord(transaction, 'utilityMeterData', meterData);
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);

      const predictorGUIDs: Array<PredictorGuidPair> = [];
      if (backupFile.predictors) {
        for (let i = 0; i < backupFile.predictors.length; i++) {
          const predictor: IdbPredictor = backupFile.predictors[i];
          const newGUID: string = this.getGUID();
          const facilityId: string = this.getNewId(predictor.facilityId, facilityGUIDs);
          predictorGUIDs.push({
            newId: newGUID,
            oldId: predictor.guid,
            predictorName: predictor.name,
            facilityId
          });
          delete predictor.id;
          predictor.guid = newGUID;
          predictor.accountId = accountGUIDs.newId;
          predictor.facilityId = facilityId;
          await this.addRecord(transaction, 'predictor', predictor);
        }
      }

      if (backupFile.predictorDataV2) {
        for (let i = 0; i < backupFile.predictorDataV2.length; i++) {
          const predictorData: IdbPredictorData = backupFile.predictorDataV2[i];
          const newGUID: string = this.getGUID();
          delete predictorData.id;
          predictorData.guid = newGUID;
          predictorData.accountId = accountGUIDs.newId;
          predictorData.facilityId = this.getNewId(predictorData.facilityId, facilityGUIDs);
          predictorData.predictorId = this.getNewId(predictorData.predictorId, predictorGUIDs);
          await this.addRecord(transaction, 'predictorData', predictorData);
        }
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      const facilityAnalysisGUIDs: Array<GuidPair> = [];
      const bankedItems: Array<IdbAnalysisItem> = [];
      for (let i = 0; i < backupFile.facilityAnalysisItems.length; i++) {
        const facilityAnalysisItem: IdbAnalysisItem = backupFile.facilityAnalysisItems[i];
        const newGUID: string = this.getGUID();
        facilityAnalysisGUIDs.push({
          newId: newGUID,
          oldId: facilityAnalysisItem.guid
        });
        delete facilityAnalysisItem.id;
        delete facilityAnalysisItem.dataCheckReviews;
        facilityAnalysisItem.guid = newGUID;
        facilityAnalysisItem.accountId = accountGUIDs.newId;
        facilityAnalysisItem.facilityId = this.getNewId(facilityAnalysisItem.facilityId, facilityGUIDs);
        facilityAnalysisItem.groups.forEach(group => {
          group.idbGroupId = this.getNewId(group.idbGroupId, meterGroupGUIDs);
          if (group.models) {
            group.models = group.models.map(model => {
              model.predictorVariables.forEach(variable => {
                variable.id = this.getNewId(variable.id, predictorGUIDs);
                if (variable.id == undefined) {
                  const facilityPredictorNewIds: PredictorGuidPair = predictorGUIDs.find(predictor => {
                    return predictor.predictorName === variable.name && predictor.facilityId === facilityAnalysisItem.facilityId;
                  });
                  if (facilityPredictorNewIds) {
                    variable.id = facilityPredictorNewIds.newId;
                  }
                }
              });
              return this.getTrimmedModel(model);
            });
          }
          group.predictorVariables.forEach(variable => {
            variable.id = this.getNewId(variable.id, predictorGUIDs);
          });
        });
        const facilityAnalysisId = await this.addRecord(transaction, 'analysisItems', facilityAnalysisItem);
        facilityAnalysisItem.id = facilityAnalysisId;
        if (facilityAnalysisItem.hasBanking) {
          bankedItems.push(facilityAnalysisItem);
        }
      }

      for (let i = 0; i < bankedItems.length; i++) {
        const facilityAnalysisItem: IdbAnalysisItem = bankedItems[i];
        if (facilityAnalysisItem.hasBanking) {
          facilityAnalysisItem.bankedAnalysisItemId = this.getNewId(facilityAnalysisItem.bankedAnalysisItemId, facilityAnalysisGUIDs);
          await transaction.put('analysisItems', facilityAnalysisItem);
        }
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      const accountAnalysisGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.accountAnalysisItems.length; i++) {
        const accountAnalysisItem: IdbAccountAnalysisItem = backupFile.accountAnalysisItems[i];
        const newGUID: string = this.getGUID();
        accountAnalysisGUIDs.push({
          newId: newGUID,
          oldId: accountAnalysisItem.guid
        });
        delete accountAnalysisItem.id;
        delete accountAnalysisItem.dataCheckReviews;
        accountAnalysisItem.guid = newGUID;
        accountAnalysisItem.accountId = accountGUIDs.newId;
        accountAnalysisItem.facilityAnalysisItems.forEach(item => {
          item.facilityId = this.getNewId(item.facilityId, facilityGUIDs);
          if (item.analysisItemId && item.analysisItemId != 'skip') {
            item.analysisItemId = this.getNewId(item.analysisItemId, facilityAnalysisGUIDs);
          }
        });
        await this.addRecord(transaction, 'accountAnalysisItems', accountAnalysisItem);
      }

      for (let i = 0; i < backupFile.customEmissionsItems?.length; i++) {
        const customEmissionsItem: IdbCustomEmissionsItem = backupFile.customEmissionsItems[i];
        customEmissionsItem.accountId = accountGUIDs.newId;
        delete customEmissionsItem.id;
        await this.addRecord(transaction, 'customEmissionsItems', customEmissionsItem);
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      for (let i = 0; i < backupFile.customFuels?.length; i++) {
        const customFuel: IdbCustomFuel = backupFile.customFuels[i];
        customFuel.accountId = accountGUIDs.newId;
        delete customFuel.id;
        await this.addRecord(transaction, 'customFuels', customFuel);
      }

      for (let i = 0; i < backupFile.customGWPs?.length; i++) {
        const customGWP: IdbCustomGWP = backupFile.customGWPs[i];
        customGWP.accountId = accountGUIDs.newId;
        delete customGWP.id;
        await this.addRecord(transaction, 'customGWP', customGWP);
      }

      this.loadingService.setCurrentLoadingIndex(++currIdx);
      const accountReportGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.accountReports?.length; i++) {
        const accountReport: IdbAccountReport = backupFile.accountReports[i];
        const oldGuid = accountReport.guid;
        accountReport.guid = this.getGUID();
        accountReportGUIDs.push({ oldId: oldGuid, newId: accountReport.guid });
        delete accountReport.id;
        accountReport.accountId = accountGUIDs.newId;
        accountReport.dataOverviewReportSetup.includedFacilities.forEach(facility => {
          facility.facilityId = this.getNewId(facility.facilityId, facilityGUIDs);
        });
        if (accountReport.reportType !== 'betterPlants') {
          accountReport.betterPlantsReportSetup = {
            analysisItemId: undefined,
            includeFacilityNames: undefined,
            baselineAdjustmentNotes: undefined,
            modificationNotes: undefined,
          };
        }

        if (accountReport.betterClimateReportSetup?.includedFacilityGroups) {
          accountReport.betterClimateReportSetup.includedFacilityGroups.forEach(facilityGroup => {
            facilityGroup.facilityId = this.getNewId(facilityGroup.facilityId, facilityGUIDs);
            facilityGroup.groups.forEach(group => {
              group.groupId = this.getNewId(group.groupId, meterGroupGUIDs);
            });
          });
        }

        const analysisSetupKey = accountReportAnalysisSetupKey(accountReport.reportType);
        if (analysisSetupKey && accountReport[analysisSetupKey]) {
          accountReport[analysisSetupKey].analysisItemId = this.getNewId(accountReport[analysisSetupKey].analysisItemId, accountAnalysisGUIDs);
        }
        await this.addRecord(transaction, 'accountReports', accountReport);
      }

      this.loadingService.setLoadingMessage('Adding Facility Reports...');
      const facilityReportGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.facilityReports?.length; i++) {
        const facilityReport: IdbFacilityReport = backupFile.facilityReports[i];
        const oldGuid = facilityReport.guid;
        facilityReport.guid = this.getGUID();
        facilityReportGUIDs.push({ oldId: oldGuid, newId: facilityReport.guid });
        delete facilityReport.id;
        facilityReport.accountId = accountGUIDs.newId;
        facilityReport.facilityId = this.getNewId(facilityReport.facilityId, facilityGUIDs);
        facilityReport.analysisItemId = this.getNewId(facilityReport.analysisItemId, facilityAnalysisGUIDs);
        await this.addRecord(transaction, 'facilityReports', facilityReport);
      }

      this.loadingService.setLoadingMessage('Adding Facility Energy Use Groups...');
      const facilityEnergyUseGroupGUIDs: Array<GuidPair> = [];
      for (let i = 0; i < backupFile.facilityEnergyUseGroups?.length; i++) {
        const facilityEnergyUseGroup: IdbFacilityEnergyUseGroup = backupFile.facilityEnergyUseGroups[i];
        const newId: string = this.getGUID();
        facilityEnergyUseGroupGUIDs.push({
          oldId: facilityEnergyUseGroup.guid,
          newId
        });
        delete facilityEnergyUseGroup.id;
        facilityEnergyUseGroup.guid = newId;
        facilityEnergyUseGroup.accountId = accountGUIDs.newId;
        facilityEnergyUseGroup.facilityId = this.getNewId(facilityEnergyUseGroup.facilityId, facilityGUIDs);
        await this.addRecord(transaction, 'facilityEnergyUseGroups', facilityEnergyUseGroup);
      }

      this.loadingService.setLoadingMessage('Adding Facility Energy Use Equipment...');
      for (let i = 0; i < backupFile.facilityEnergyUseEquipment?.length; i++) {
        const facilityEnergyUseEquipment: IdbFacilityEnergyUseEquipment = backupFile.facilityEnergyUseEquipment[i];
        facilityEnergyUseEquipment.guid = this.getGUID();
        delete facilityEnergyUseEquipment.id;
        facilityEnergyUseEquipment.accountId = accountGUIDs.newId;
        facilityEnergyUseEquipment.facilityId = this.getNewId(facilityEnergyUseEquipment.facilityId, facilityGUIDs);
        await this.addRecord(transaction, 'facilityEnergyUseEquipment',
          remapEnergyUseBackupReferences(facilityEnergyUseEquipment, facilityEnergyUseGroupGUIDs, meterGroupGUIDs));
      }

      if (Array.isArray(newAccount.portfolioFacilityOrder)) {
        const facilityMap = new Map(facilityGUIDs.map(pair => [pair.oldId, pair.newId]));
        newAccount.portfolioFacilityOrder = [...new Set(newAccount.portfolioFacilityOrder)]
          .flatMap(guid => facilityMap.has(guid) ? [facilityMap.get(guid)!] : []);
      }
      newAccount.statusWarningDismissals = remapStatusWarningDismissals(
        newAccount.statusWarningDismissals,
        {
          account: accountGUIDs,
          facilities: facilityGUIDs,
          meters: meterGUIDs,
          meterGroups: meterGroupGUIDs,
          predictors: predictorGUIDs,
          facilityAnalyses: facilityAnalysisGUIDs,
          accountAnalyses: accountAnalysisGUIDs,
          facilityReports: facilityReportGUIDs,
          accountReports: accountReportGUIDs
        }
      );
      if (newAccount.selectedEnergyAnalysisId) {
        newAccount.selectedEnergyAnalysisId = this.getNewId(newAccount.selectedEnergyAnalysisId, accountAnalysisGUIDs);
      }
      if (newAccount.selectedWaterAnalysisId) {
        newAccount.selectedWaterAnalysisId = this.getNewId(newAccount.selectedWaterAnalysisId, accountAnalysisGUIDs);
      }
      await transaction.put('accounts', newAccount);

      for (let i = 0; i < backupFile.facilities.length; i++) {
        const facility: IdbFacility = backupFile.facilities[i];
        let needsFacilityUpdate: boolean = false;
        if (facility.selectedEnergyAnalysisId) {
          facility.selectedEnergyAnalysisId = this.getNewId(facility.selectedEnergyAnalysisId, facilityAnalysisGUIDs);
          needsFacilityUpdate = true;
        }
        if (facility.selectedWaterAnalysisId) {
          facility.selectedWaterAnalysisId = this.getNewId(facility.selectedWaterAnalysisId, facilityAnalysisGUIDs);
          needsFacilityUpdate = true;
        }
        if (needsFacilityUpdate) {
          await transaction.put('facilities', facility);
        }
      }

      visualizations.push(...await this.importVisualizations(transaction, preparedBackup, newAccount.guid,
        visualizationTransferMaps(preparedBackup, backupFile)));
      return newAccount;
    });
    this.summary.set(summarizeVisualizationImport(result.guid, visualizations));
    return result;
  }

  async importFacilityBackupFile(
    preparedBackup: PreparedBackupFile,
    accountGUID: string,
    currIdx: number
  ): Promise<{ facility: IdbFacility, index?: number }> {
    this.summary.set(undefined);
    const visualizations: IdbSavedVisualization[] = [];
    const result = await this.transactions.runTransaction(FACILITY_IMPORT_STORES, 'readwrite', async transaction => {
      const imported = await this.importFacilityBackupInTransaction(transaction, preparedBackup, accountGUID, currIdx);
      visualizations.push(...await this.importVisualizations(transaction, preparedBackup, accountGUID,
        visualizationTransferMaps(preparedBackup, imported.transferred)));
      return { facility: imported.facility, index: imported.index };
    });
    this.summary.set(summarizeVisualizationImport(accountGUID, visualizations));
    return result;
  }

  async replaceFacilityBackupFile(
    preparedBackup: PreparedBackupFile,
    accountGUID: string,
    facilityToReplace: IdbFacility,
    currIdx: number
  ): Promise<{ facility: IdbFacility, index?: number }> {
    this.summary.set(undefined);
    const visualizations: IdbSavedVisualization[] = [];
    const result = await this.transactions.runTransaction(FACILITY_RESTORE_STORES, 'readwrite', async transaction => {
      currIdx = await this.deleteFacilityInTransaction(transaction, facilityToReplace, accountGUID, currIdx);
      const imported = await this.importFacilityBackupInTransaction(transaction, preparedBackup, accountGUID, currIdx);
      visualizations.push(...await this.importVisualizations(transaction, preparedBackup, accountGUID,
        visualizationTransferMaps(preparedBackup, imported.transferred)));
      return { facility: imported.facility, index: imported.index };
    });
    this.summary.set(summarizeVisualizationImport(accountGUID, visualizations));
    return result;
  }

  async importSelectedFacilities(
    selectedAccount: IdbAccount,
    preparedFacilities: Array<{ selectedFacility: IdbFacility; backup: PreparedBackupFile; }>,
    facilityImportSelections: Record<string, { importAs: 'new' | 'replace'; replacedFacility?: string }>,
    accountFacilities: Array<IdbFacility>
  ): Promise<void> {
    this.summary.set(undefined);
    const visualizations: IdbSavedVisualization[] = [];
    await this.transactions.runTransaction(FACILITY_RESTORE_STORES, 'readwrite', async transaction => {
      const importedBackups: Array<{ source: PreparedBackupFile; transferred: PreparedBackupFile }> = [];
      const ownershipFacilities = await transaction.getAllByIndex<IdbFacility>('facilities', 'accountId', selectedAccount.guid);
      let idx = 1;
      for (const { selectedFacility } of preparedFacilities) {
        const selection = facilityImportSelections[selectedFacility.name];
        if (selection.importAs === 'replace' && selection.replacedFacility) {
          const facilityToReplace = accountFacilities.find(item => item.name === selection.replacedFacility);
          if (facilityToReplace) {
            idx = await this.deleteFacilityInTransaction(transaction, facilityToReplace, selectedAccount.guid, idx, ownershipFacilities);
          }
        }
      }

      for (const { backup } of preparedFacilities) {
        this.loadingService.setCurrentLoadingIndex(idx);
        const imported = await this.importFacilityBackupInTransaction(
          transaction,
          backup,
          selectedAccount.guid,
          idx
        );
        importedBackups.push({ source: backup, transferred: imported.transferred });
        idx = (imported.index ?? idx) + 1;
      }
      const maps = mergeVisualizationTransferMaps(importedBackups.map(item => visualizationTransferMaps(item.source, item.transferred)));
      for (const item of importedBackups) {
        visualizations.push(...await this.importVisualizations(transaction, item.source, selectedAccount.guid, maps));
      }
    });
    this.summary.set(summarizeVisualizationImport(selectedAccount.guid, visualizations));
  }

  private async importFacilityBackupInTransaction(
    transaction: IndexedDbTransactionContext,
    preparedBackup: PreparedBackupFile,
    accountGUID: string,
    currIdx: number
  ): Promise<{ facility: IdbFacility, index?: number, transferred: PreparedBackupFile }> {
    const backupFile = structuredClone(preparedBackup);

    await this.requireUnresolvedGroupsAvailable(transaction, backupFile);
    delete backupFile.facility.id;
    backupFile.facility.accountId = accountGUID;
    const newFacilityGUID: string = this.getGUID();
    backupFile.facility.guid = newFacilityGUID;
    const newFacilityId = await this.addRecord(transaction, 'facilities', backupFile.facility);
    const newFacility: IdbFacility = { ...backupFile.facility, id: newFacilityId };

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    const meterGroupGUIDs: Array<GuidPair> = [];
    for (let i = 0; i < backupFile.groups.length; i++) {
      const group: IdbUtilityMeterGroup = backupFile.groups[i];
      const newGUID: string = this.getGUID();
      meterGroupGUIDs.push({
        newId: newGUID,
        oldId: group.guid
      });
      delete group.id;
      group.accountId = accountGUID;
      group.facilityId = newFacilityGUID;
      group.guid = newGUID;
      await this.addRecord(transaction, 'utilityMeterGroups', group);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    const meterGUIDs: Array<GuidPair> = [];
    for (let i = 0; i < backupFile.meters.length; i++) {
      const meter: IdbUtilityMeter = backupFile.meters[i];
      const newGUID: string = this.getGUID();
      meterGUIDs.push({
        newId: newGUID,
        oldId: meter.guid
      });
      delete meter.id;
      meter.accountId = accountGUID;
      meter.facilityId = newFacilityGUID;
      meter.guid = newGUID;
      meter.groupId = this.getNewId(meter.groupId, meterGroupGUIDs);
      await this.addRecord(transaction, 'utilityMeter', meter);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    for (let i = 0; i < backupFile.meterData.length; i++) {
      const meterData: IdbUtilityMeterData = backupFile.meterData[i];
      const newGUID: string = this.getGUID();
      delete meterData.id;
      meterData.guid = newGUID;
      meterData.accountId = accountGUID;
      meterData.facilityId = newFacilityGUID;
      meterData.meterId = this.getNewId(meterData.meterId, meterGUIDs);
      await this.addRecord(transaction, 'utilityMeterData', meterData);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    const predictorGUIDs: Array<PredictorGuidPair> = [];
    if (backupFile.predictors) {
      for (let i = 0; i < backupFile.predictors.length; i++) {
        const predictor: IdbPredictor = backupFile.predictors[i];
        const newGUID: string = this.getGUID();
        predictorGUIDs.push({
          newId: newGUID,
          oldId: predictor.guid,
          predictorName: predictor.name,
          facilityId: newFacilityGUID
        });
        delete predictor.id;
        predictor.guid = newGUID;
        predictor.accountId = accountGUID;
        predictor.facilityId = newFacilityGUID;
        await this.addRecord(transaction, 'predictor', predictor);
      }
    }

    if (backupFile.predictorDataV2) {
      for (let i = 0; i < backupFile.predictorDataV2.length; i++) {
        const predictorData: IdbPredictorData = backupFile.predictorDataV2[i];
        const newGUID: string = this.getGUID();
        delete predictorData.id;
        predictorData.guid = newGUID;
        predictorData.accountId = accountGUID;
        predictorData.facilityId = newFacilityGUID;
        predictorData.predictorId = this.getNewId(predictorData.predictorId, predictorGUIDs);
        await this.addRecord(transaction, 'predictorData', predictorData);
      }
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    const facilityAnalysisGUIDs: Array<GuidPair> = [];
    for (let i = 0; i < backupFile.facilityAnalysisItems.length; i++) {
      const facilityAnalysisItem: IdbAnalysisItem = backupFile.facilityAnalysisItems[i];
      const newGUID: string = this.getGUID();
      facilityAnalysisGUIDs.push({
        newId: newGUID,
        oldId: facilityAnalysisItem.guid
      });
      delete facilityAnalysisItem.id;
        delete facilityAnalysisItem.dataCheckReviews;
      facilityAnalysisItem.guid = newGUID;
      facilityAnalysisItem.accountId = accountGUID;
      facilityAnalysisItem.facilityId = newFacilityGUID;
      facilityAnalysisItem.groups.forEach(group => {
        group.idbGroupId = this.getNewId(group.idbGroupId, meterGroupGUIDs);
        group.predictorVariables.forEach(variable => {
          variable.id = this.getNewId(variable.id, predictorGUIDs);
        });
        group.models?.forEach(model => {
          model.predictorVariables.forEach(variable => {
            variable.id = this.getNewId(variable.id, predictorGUIDs);
            if (variable.id == undefined) {
              const facilityPredictorNewIds: PredictorGuidPair = predictorGUIDs.find(predictor => {
                return predictor.predictorName === variable.name && predictor.facilityId === newFacilityGUID;
              });
              if (facilityPredictorNewIds) {
                variable.id = facilityPredictorNewIds.newId;
              }
            }
          });
        });
      });
      await this.addRecord(transaction, 'analysisItems', facilityAnalysisItem);
    }

    for (let i = 0; i < backupFile.customEmissionsItems.length; i++) {
      const customEmissionsItem: IdbCustomEmissionsItem = backupFile.customEmissionsItems[i];
      customEmissionsItem.accountId = accountGUID;
      delete customEmissionsItem.id;
      await this.addRecord(transaction, 'customEmissionsItems', customEmissionsItem);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    for (let i = 0; i < backupFile.customFuels.length; i++) {
      const customFuel: IdbCustomFuel = backupFile.customFuels[i];
      customFuel.accountId = accountGUID;
      delete customFuel.id;
      await this.addRecord(transaction, 'customFuels', customFuel);
    }

    for (let i = 0; i < backupFile.customGWPs.length; i++) {
      const customGWP: IdbCustomGWP = backupFile.customGWPs[i];
      customGWP.accountId = accountGUID;
      delete customGWP.id;
      await this.addRecord(transaction, 'customGWP', customGWP);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    const accountAnalysisItems = await transaction.getAllByIndex<IdbAccountAnalysisItem>(
      'accountAnalysisItems',
      'accountId',
      accountGUID
    );
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems.push({
        facilityId: newFacilityGUID,
        analysisItemId: undefined
      });
      await transaction.put('accountAnalysisItems', accountAnalysisItems[i]);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    const accountReports = await transaction.getAllByIndex<IdbAccountReport>(
      'accountReports',
      'accountId',
      accountGUID
    );
    for (let reportIndex = 0; reportIndex < accountReports.length; reportIndex++) {
      accountReports[reportIndex].dataOverviewReportSetup.includedFacilities.push({
        facilityId: newFacilityGUID,
        included: false,
        includedGroups: meterGroupGUIDs.map(group => {
          return {
            groupId: group.newId,
            include: true
          };
        })
      });
      await transaction.put('accountReports', accountReports[reportIndex]);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    this.loadingService.setLoadingMessage('Adding Facility Reports...');
    for (let i = 0; i < backupFile.facilityReports?.length; i++) {
      const facilityReport: IdbFacilityReport = backupFile.facilityReports[i];
      facilityReport.guid = this.getGUID();
      delete facilityReport.id;
      facilityReport.accountId = accountGUID;
      facilityReport.facilityId = newFacilityGUID;
      facilityReport.analysisItemId = this.getNewId(facilityReport.analysisItemId, facilityAnalysisGUIDs);
      await this.addRecord(transaction, 'facilityReports', facilityReport);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    this.loadingService.setLoadingMessage('Adding Facility Energy Use Groups...');
    const facilityEnergyUseGroupGUIDs: Array<GuidPair> = [];
    for (let i = 0; i < backupFile.facilityEnergyUseGroups?.length; i++) {
      const facilityEnergyUseGroup: IdbFacilityEnergyUseGroup = backupFile.facilityEnergyUseGroups[i];
      const newGUID: string = this.getGUID();
      facilityEnergyUseGroupGUIDs.push({
        newId: newGUID,
        oldId: facilityEnergyUseGroup.guid
      });
      delete facilityEnergyUseGroup.id;
      facilityEnergyUseGroup.guid = newGUID;
      facilityEnergyUseGroup.accountId = accountGUID;
      facilityEnergyUseGroup.facilityId = newFacilityGUID;
      await this.addRecord(transaction, 'facilityEnergyUseGroups', facilityEnergyUseGroup);
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    this.loadingService.setLoadingMessage('Adding Facility Energy Use Equipment...');
    for (let i = 0; i < backupFile.facilityEnergyUseEquipment?.length; i++) {
      const facilityEnergyUseEquipment: IdbFacilityEnergyUseEquipment = backupFile.facilityEnergyUseEquipment[i];
      facilityEnergyUseEquipment.guid = this.getGUID();
      delete facilityEnergyUseEquipment.id;
      facilityEnergyUseEquipment.accountId = accountGUID;
      facilityEnergyUseEquipment.facilityId = newFacilityGUID;
      await this.addRecord(transaction, 'facilityEnergyUseEquipment',
        remapEnergyUseBackupReferences(facilityEnergyUseEquipment, facilityEnergyUseGroupGUIDs, meterGroupGUIDs));
    }

    let needsFacilityUpdate: boolean = false;
    if (newFacility.selectedEnergyAnalysisId) {
      newFacility.selectedEnergyAnalysisId = this.getNewId(newFacility.selectedEnergyAnalysisId, facilityAnalysisGUIDs);
      needsFacilityUpdate = true;
    }
    if (newFacility.selectedWaterAnalysisId) {
      newFacility.selectedWaterAnalysisId = this.getNewId(newFacility.selectedWaterAnalysisId, facilityAnalysisGUIDs);
      needsFacilityUpdate = true;
    }
    if (needsFacilityUpdate) {
      await transaction.put('facilities', newFacility);
    }
    return { facility: newFacility, index: currIdx, transferred: backupFile };
  }

  private async deleteFacilityInTransaction(
    transaction: IndexedDbTransactionContext,
    facility: IdbFacility,
    accountGuid: string,
    currIdx: number,
    ownershipFacilities?: readonly IdbFacility[]
  ): Promise<number> {
    if (facility.id === undefined) {
      throw new Error('The facility to replace does not have a local IndexedDB key.');
    }

    const facilities = ownershipFacilities ?? await transaction.getAllByIndex<IdbFacility>('facilities', 'accountId', accountGuid);
    for (const storeDefinition of FACILITY_DELETION_CHILD_STORES) {
      this.loadingService.setCurrentLoadingIndex(++currIdx);
      if (storeDefinition.storeName === 'savedVisualizations') {
        const records = await transaction.getAllByIndex<IdbSavedVisualization>('savedVisualizations', 'accountId', accountGuid);
        for (const record of records) if (savedVisualizationFacilityGuid(record, facilities) === facility.guid) await transaction.deleteByKey('savedVisualizations', record.id!);
      } else await transaction.deleteAllByIndex(storeDefinition.storeName, 'facilityId', facility.guid);
    }

    const modifiedDate = new Date();

    this.loadingService.setCurrentLoadingIndex(++currIdx);
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

    this.loadingService.setCurrentLoadingIndex(++currIdx);
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

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    await transaction.deleteByKey('facilities', facility.id);

    return currIdx;
  }

  private async importVisualizations(transaction: IndexedDbTransactionContext, source: PreparedBackupFile,
    accountGuid: string, maps: VisualizationGuidMaps): Promise<IdbSavedVisualization[]> {
    const imported: IdbSavedVisualization[] = [];
    if (!source.savedVisualizations?.length) return imported;
    const catalog = await readVisualizationReferenceCatalog(transaction);
    for (const record of source.savedVisualizations ?? []) {
      const target = transferSavedVisualization(record, accountGuid, maps, this.getGUID());
      const decoded = decodeVisualizationDefinition(target.definition);
      if (!target.preservation?.locked && 'definition' in decoded) {
        target.preservation = { ...target.preservation,
          references: inspectVisualizationReferences(decoded.definition, catalog, target.preservation?.references),
          transfers: target.preservation?.transfers ?? [] };
      }
      target.id = await this.addRecord(transaction, 'savedVisualizations', target);
      imported.push(target);
    }
    return imported;
  }

  private async addRecord<T extends { id?: number }>(
    transaction: IndexedDbTransactionContext,
    storeName: VerifiStoreName,
    value: T
  ): Promise<number> {
    const key = await transaction.add(storeName, value);
    if (typeof key !== 'number') {
      throw new Error(`Expected a numeric key when adding to ${storeName}.`);
    }
    return key;
  }

  private getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getNewId(oldId: string, GUIDs: Array<GuidPair>): string {
    let GUID: string = GUIDs.find(id => { return id.oldId == oldId; })?.newId;
    return GUID;
  }

  private async requireUnresolvedGroupsAvailable(transaction: IndexedDbTransactionContext, backup: PreparedBackupFile): Promise<void> {
    for (const { store, guid } of unresolvedEnergyUseBackupReferences(backup)) {
      if ((await transaction.getAllByIndex(store, 'guid', guid)).length) {
        throw new BackupRelationshipError('An unavailable group reference is already used by another saved group. The backup cannot be imported without changing its relationships.');
      }
    }
  }

  private getTrimmedModel(model: JStatRegressionModel): JStatRegressionModel {
    return {
      coef: model.coef,
      R2: model.R2,
      SSE: model.SSE,
      SSR: model.SSR,
      SST: model.SST,
      adjust_R2: model.adjust_R2,
      df_model: model.df_model,
      df_resid: model.df_resid,
      ybar: model.ybar,
      t: {
        se: model.t.se,
        sigmaHat: model.t.sigmaHat,
        p: model.t.p
      },
      f: {
        pvalue: model.f.pvalue,
        F_statistic: model.f.F_statistic
      },
      modelYear: model.modelYear,
      predictorVariables: model.predictorVariables,
      modelId: model.modelId,
      isValid: model.isValid,
      modelPValue: model.modelPValue,
      modelNotes: model.modelNotes,
      errorModeling: model.errorModeling,
      SEPValidation: model.SEPValidation,
      SEPValidationPass: model.SEPValidationPass,
      dataValidationNotes: model.dataValidationNotes,
      modelValidationNotes: model.modelValidationNotes
    };
  }
}

function dedupeStores(
  ...storeLists: ReadonlyArray<ReadonlyArray<VerifiStoreName>>
): Array<VerifiStoreName> {
  const merged = new Set<VerifiStoreName>();
  for (const storeList of storeLists) {
    for (const storeName of storeList) {
      merged.add(storeName);
    }
  }
  return [...merged];
}
