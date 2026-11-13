import { BackupImportCommandService } from './backup-import-command.service';
import { remapDataQualityBackupReferences } from './data-quality-backup-relations';
import { Injectable } from '@angular/core';
import { AccountdbService } from '@data/indexedDB/account-db.service';
import { FacilitydbService } from '@data/indexedDB/facility-db.service';
import { UtilityMeterdbService } from '@data/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '@data/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '@data/indexedDB/utilityMeterGroup-db.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AccountAnalysisDbService } from '@data/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from '@data/indexedDB/analysis-db.service';
import { AccountReportDbService } from '@data/indexedDB/account-report-db.service';
import { JStatRegressionModel } from '@data/models/analysis';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '@platform/analytics/analytics.service';
import { CustomEmissionsDbService } from '@data/indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from '@data/indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from '@data/indexedDB/custom-gwp-db.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { PredictorDataDbService } from '@data/indexedDB/predictor-data-db.service';
import { PredictorDbService } from '@data/indexedDB/predictor-db.service';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import JSZip from 'jszip';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { FacilityReportsDbService } from '@data/indexedDB/facility-reports-db.service';
import { FacilityEnergyUseGroupsDbService } from '@data/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { FacilityEnergyUseEquipmentDbService } from '@data/indexedDB/facility-energy-use-equipment-db.service';
import { normalizeAnalysisGroupModelStorage } from '@shared/shared-analysis/calculations/regression-model-recovery';
import { BackupFile } from '@data/models/backup-file';
import { CURRENT_DATA_VERSION } from '@data/indexedDB/data-migrations/data-migration.models';
import { BackupRelationshipError, PreparedBackupFile } from './backup-preparation.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupExportCoordinator } from './backup-export-coordinator.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { remapEnergyUseBackupReferences, unresolvedEnergyUseBackupReferences } from './energy-use-backup-relations';

export { BackupFile } from '@data/models/backup-file';

@Injectable({
  providedIn: 'root'
})
export class BackupDataService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService, private loadingService: LoadingService, private accountAnalysisDbService: AccountAnalysisDbService,
    private analysisDbService: AnalysisDbService, private accountReportsDbService: AccountReportDbService,
    private analyticsService: AnalyticsService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService,
    private predictorDataDbService: PredictorDataDbService,
    private predictorDbService: PredictorDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private workspaceStore: AccountWorkspaceStore,
    private backupExportCoordinator: BackupExportCoordinator,
    private backupSnapshotBuilder: WorkspaceBackupSnapshotBuilder,
    private readonly backupImportCommand: BackupImportCommandService) { }


  async backupAccount(downloadAsZip?: boolean) {
    await this.backupExportCoordinator.exportActiveAccount({ downloadAsZip });
  }

  getAccountBackupFile(): BackupFile {
    const snapshot = this.workspaceStore.snapshot();
    if (!snapshot) { throw new Error('An account workspace must be loaded before creating a backup.'); }
    return this.backupSnapshotBuilder.buildAccountBackup(snapshot);
  }



  async backupFacility(facility: IdbFacility) {
    const snapshot = this.workspaceStore.snapshot();
    if (!snapshot || !snapshot.facilities.some(item => item.guid === facility.guid)) {
      throw new Error('The facility must belong to the active workspace before creating a backup.');
    }
    await this.backupExportCoordinator.exportFacility(facility.guid);
  }

  async downloadBackup(backupFile: BackupFile, backupName: string, downloadAsZip?: boolean) {
    if (downloadAsZip) {
      const stringifyData = JSON.stringify(backupFile);
      const zip = new JSZip();
      const date = new Date();
      const dateStr = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
      const name = backupName + dateStr;
      const jsonFileName = name + '.json';
      const zipFileName = name + '.zip';
      // Add the JSON file to the zip
      zip.file(jsonFileName, stringifyData);
      // Generate the zip and trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const dlLink = window.document.createElement("a");
      const url = URL.createObjectURL(content);
      dlLink.setAttribute("href", url);
      dlLink.setAttribute('download', zipFileName);
      window.document.body.appendChild(dlLink);
      dlLink.click();
      window.document.body.removeChild(dlLink);
      URL.revokeObjectURL(url);

    } else {

      let stringifyData = JSON.stringify(backupFile);
      let dlLink = window.document.createElement("a");
      let dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(stringifyData);
      dlLink.setAttribute("href", dataStr);
      const date = new Date();
      const dateStr = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
      let name = backupName + dateStr;
      dlLink.setAttribute('download', name + '.json');
      window.document.body.appendChild(dlLink);
      dlLink.click();
      window.document.body.removeChild(dlLink);
    }
  }

  getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getNewId(oldId: string, GUIDs: Array<{ oldId: string, newId: string }>): string {
    let GUID: string = GUIDs.find(id => { return id.oldId == oldId })?.newId;
    return GUID;
  }

  accountBackupMessages() {
    this.loadingService.addLoadingMessage('Adding Facilities');
    this.loadingService.addLoadingMessage('Adding Meter Groups');
    this.loadingService.addLoadingMessage('Adding Meters');
    this.loadingService.addLoadingMessage('Adding Meter Data');
    this.loadingService.addLoadingMessage('Adding Predictors');
    this.loadingService.addLoadingMessage('Adding Facility Analysis Items');
    this.loadingService.addLoadingMessage('Adding Account Analysis Items');
    this.loadingService.addLoadingMessage('Adding Custom Fuels');
    this.loadingService.addLoadingMessage('Adding Account Reports');
  }

  async importAccountBackupFile(preparedBackup: PreparedBackupFile, currIdx: number): Promise<IdbAccount> {
    return this.backupImportCommand.importAccountBackupFile(preparedBackup, currIdx);
  }

  facilityBackupMessages() {
    this.loadingService.addLoadingMessage('Adding Meter Groups');
    this.loadingService.addLoadingMessage('Adding Meters');
    this.loadingService.addLoadingMessage('Adding Meter Data');
    this.loadingService.addLoadingMessage('Adding Predictors');
    this.loadingService.addLoadingMessage('Adding Facility Analysis Items');
    this.loadingService.addLoadingMessage('Adding Custom Fuels');
    this.loadingService.addLoadingMessage('Updating Account Analysis Items');
    this.loadingService.addLoadingMessage('Updating Account Reports');
  }

  async importFacilityBackupFile(preparedBackup: PreparedBackupFile, accountGUID: string, currIdx: number): Promise<{ facility: IdbFacility, index?: number }> {
    return this.backupImportCommand.importFacilityBackupFile(preparedBackup, accountGUID, currIdx);
  }

  getImportDate(date: Date): Date {
    //date imported with timestap cause problems.
    if (typeof date.getMonth === 'function') {
      return date;
    } else {
      let readDateString: string = String(date);
      //remove time stamp
      let newString: string = readDateString.split('T')[0];
      //Format: YYYY-MM-DD
      let yearMonthDate: Array<string> = newString.split('-');
      //Month 0 indexed (-1)
      if (yearMonthDate.length == 3) {
        return new Date(Number(yearMonthDate[0]), Number(yearMonthDate[1]) - 1, Number(yearMonthDate[2]));
      } else {
        return date;
      }
    }
  }

  getTrimmedModel(model: JStatRegressionModel): JStatRegressionModel {
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
    }
  }

  trimGroups(groups: Array<IdbUtilityMeterGroup>): Array<IdbUtilityMeterGroup> {
    return groups.map(group => {
      delete group.combinedMonthlyData;
      return group;
    })
  }

  private async requireUnresolvedGroupsAvailable(backup: PreparedBackupFile): Promise<void> {
    for (const { store, guid } of unresolvedEnergyUseBackupReferences(backup)) {
      const repository = store === 'facilityEnergyUseGroups' ? this.facilityEnergyUseGroupsDbService : this.utilityMeterGroupDbService;
      if (await repository.getStoredByGuid(guid)) {
        throw new BackupRelationshipError('An unavailable group reference is already used by another saved group. The backup cannot be imported without changing its relationships.');
      }
    }
  }

  // Export only a valid selected model, recovering orphaned selections first.
  trimAnalysisModels(
    analysisItems: Array<IdbAnalysisItem>,
    facilities: Array<IdbFacility>
  ): Array<IdbAnalysisItem> {
    return analysisItems.map(item => {
      const facility = facilities.find(candidate => candidate.guid === item.facilityId);
      return {
        ...item,
        groups: item.groups.map(group => {
          const normalizedGroup = normalizeAnalysisGroupModelStorage(
            group,
            facility,
            item.baselineYear
          ).group;
          return {
            ...normalizedGroup,
            models: normalizedGroup.models ? [...normalizedGroup.models] : undefined
          };
        })
      };
    });
  }
}
