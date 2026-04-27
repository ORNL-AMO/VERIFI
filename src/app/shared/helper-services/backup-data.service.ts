import { Injectable } from '@angular/core';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';
import { LoadingService } from '../../core-components/loading/loading.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { IdbCustomEmissionsItem } from 'src/app/models/idbModels/customEmissions';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictordbServiceDeprecated } from 'src/app/indexedDB/predictors-deprecated-db.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbPredictorEntryDeprecated, PredictorDataDeprecated } from 'src/app/models/idbModels/deprecatedPredictors';
import JSZip from 'jszip';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';

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
    private predictorsDbServiceDeprecated: PredictordbServiceDeprecated,
    private facilityReportsDbService: FacilityReportsDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService) { }


  backupAccount(downloadAsZip?: boolean) {
    let backupFile: BackupFile = this.getAccountBackupFile();
    let backupName: string = backupFile.account.name.split(' ').join('_') + '_Backup_';
    this.downloadBackup(backupFile, backupName, downloadAsZip);
  }

  getAccountBackupFile(): BackupFile {
    let backupFile: BackupFile = {
      account: this.accountDbService.selectedAccount.getValue(),
      facilities: this.facilityDbService.accountFacilities.getValue(),
      meters: this.utilityMeterDbService.accountMeters.getValue(),
      meterData: this.utilityMeterDataDbService.accountMeterData.getValue(),
      accountReports: this.accountReportsDbService.accountReports.getValue(),
      groups: this.trimGroups(this.utilityMeterGroupDbService.accountMeterGroups.getValue()),
      accountAnalysisItems: this.accountAnalysisDbService.accountAnalysisItems.getValue(),
      facilityAnalysisItems: this.trimAnalysisModels(this.analysisDbService.accountAnalysisItems.getValue()),
      predictorData: [],
      predictorDataV2: this.predictorDataDbService.accountPredictorData.getValue(),
      predictors: this.predictorDbService.accountPredictors.getValue(),
      customEmissionsItems: this.customEmissionsDbService.accountEmissionsItems.getValue(),
      customFuels: this.customFuelDbService.accountCustomFuels.getValue(),
      customGWPs: this.customGWPDbService.accountCustomGWPs.getValue(),
      facilityReports: this.facilityReportsDbService.accountFacilityReports.getValue(),
      facilityEnergyUseGroups: this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups.getValue(),
      facilityEnergyUseEquipment: this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment.getValue(),
      facility: undefined,
      backupFileType: "Account",
      origin: "VERIFI",
      timeStamp: new Date(),
      dataBackupId: Math.random().toString(36).substr(2, 9)
    };
    return backupFile;
  }



  backupFacility(facility: IdbFacility) {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.facilityId == facility.guid });

    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = meterData.filter(meter => { return meter.facilityId == facility.guid });

    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityGroups: Array<IdbUtilityMeterGroup> = groups.filter(meter => { return meter.facilityId == facility.guid });
    facilityGroups = this.trimGroups(facilityGroups);

    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = analysisItems.filter(meter => { return meter.facilityId == facility.guid });
    facilityAnalysisItems = this.trimAnalysisModels(facilityAnalysisItems);

    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let facilityPredictorData: Array<IdbPredictorData> = predictorData.filter(meter => { return meter.facilityId == facility.guid });

    let predictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let facilityPredictors: Array<IdbPredictor> = predictors.filter(meter => { return meter.facilityId == facility.guid });

    let accountFacilityReports: Array<IdbFacilityReport> = this.facilityReportsDbService.accountFacilityReports.getValue();
    let facilityReports: Array<IdbFacilityReport> = accountFacilityReports.filter(report => { return report.facilityId == facility.guid });

    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups.getValue();
    let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = accountEnergyUseGroups.filter(group => { return group.facilityId == facility.guid });

    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment.getValue();
    let facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = accountEnergyUseEquipment.filter(equipment => { return equipment.facilityId == facility.guid });

    let backupFile: BackupFile = {
      account: undefined,
      facilities: undefined,
      facility: facility,
      meters: facilityMeters,
      meterData: facilityMeterData,
      groups: facilityGroups,
      accountReports: undefined,
      accountAnalysisItems: undefined,
      facilityAnalysisItems: facilityAnalysisItems,
      predictorData: [],
      predictorDataV2: facilityPredictorData,
      predictors: facilityPredictors,
      customEmissionsItems: this.customEmissionsDbService.accountEmissionsItems.getValue(),
      customFuels: this.customFuelDbService.accountCustomFuels.getValue(),
      customGWPs: this.customGWPDbService.accountCustomGWPs.getValue(),
      facilityReports: facilityReports,
      facilityEnergyUseGroups: facilityEnergyUseGroups,
      facilityEnergyUseEquipment: facilityEnergyUseEquipment,
      backupFileType: "Facility",
      origin: "VERIFI",
      timeStamp: new Date(),
      dataBackupId: Math.random().toString(36).substr(2, 9),
    }
    let backupName: string = backupFile.facility.name.split(' ').join('_') + '_Backup_';
    this.downloadBackup(backupFile, backupName);
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

  async importAccountBackupFile(backupFile: BackupFile, currIdx: number): Promise<IdbAccount> {
    this.analyticsService.sendEvent('import_backup_file');
    let accountGUIDs: { oldId: string, newId: string } = {
      oldId: backupFile.account.guid,
      newId: this.getGUID()
    }
    delete backupFile.account.id;
    backupFile.account.guid = accountGUIDs.newId;
    let newAccount: IdbAccount = await firstValueFrom(this.accountDbService.addWithObservable(backupFile.account));
    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let facilityGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.facilities.length; i++) {
      let facility: IdbFacility = backupFile.facilities[i];
      let newGUID: string = this.getGUID();
      facilityGUIDs.push({
        oldId: facility.guid,
        newId: newGUID
      });
      facility.guid = newGUID;
      delete facility.id;
      facility.accountId = accountGUIDs.newId;
      backupFile.facilities[i] = await firstValueFrom(this.facilityDbService.addWithObservable(facility));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let meterGroupGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.groups.length; i++) {
      let group: IdbUtilityMeterGroup = backupFile.groups[i];
      let newGUID: string = this.getGUID();
      meterGroupGUIDs.push({
        newId: newGUID,
        oldId: group.guid
      });
      delete group.id;
      group.accountId = accountGUIDs.newId;
      group.facilityId = this.getNewId(group.facilityId, facilityGUIDs);
      group.guid = newGUID;
      await firstValueFrom(this.utilityMeterGroupDbService.addWithObservable(group));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let meterGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.meters.length; i++) {
      let meter: IdbUtilityMeter = backupFile.meters[i];
      let newGUID: string = this.getGUID();
      meterGUIDs.push({
        newId: newGUID,
        oldId: meter.guid
      });
      delete meter.id;
      meter.accountId = accountGUIDs.newId;
      meter.facilityId = this.getNewId(meter.facilityId, facilityGUIDs);
      meter.guid = newGUID;
      meter.groupId = this.getNewId(meter.groupId, meterGroupGUIDs);
      await firstValueFrom(this.utilityMeterDbService.addWithObservable(meter));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let meterDataGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = backupFile.meterData[i];
      let newGUID: string = this.getGUID();
      meterDataGUIDs.push({
        newId: newGUID,
        oldId: meterData.guid
      });
      delete meterData.id;
      meterData.guid = newGUID;
      meterData.accountId = accountGUIDs.newId;
      meterData.facilityId = this.getNewId(meterData.facilityId, facilityGUIDs);
      meterData.meterId = this.getNewId(meterData.meterId, meterGUIDs);
      if (meterData['readDate']) {
        const [datePart] = meterData['readDate'].split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        meterData.year = year;
        meterData.month = month;
        meterData.day = day;
        meterData.migratedDates = true;
      }
      await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterData));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);

    //migrate old
    let predictorGUIDs: Array<{ oldId: string, newId: string, predictorName: string, facilityId: string }> = new Array();
    if (backupFile.predictorData.length > 0) {
      // let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let predictorEntries: Array<IdbPredictorEntryDeprecated> = backupFile.predictorData;
      for (let index = 0; index < facilityGUIDs.length; index++) {
        let facilityGuid: { oldId: string, newId: string } = facilityGUIDs[index];
        //IDs updated above. use old id when removing
        let facilityEntries: Array<IdbPredictorEntryDeprecated> = predictorEntries.filter(entry => {
          return entry.facilityId == facilityGuid.oldId;
        });
        if (facilityEntries.length > 0) {
          let predictorDataDep: Array<PredictorDataDeprecated> = facilityEntries[0].predictors;
          for (let i = 0; i < predictorDataDep.length; i++) {
            let oldPredictor: PredictorDataDeprecated = predictorDataDep[i];
            let newPredictor: IdbPredictor = getNewIdbPredictor(accountGUIDs.newId, facilityGuid.newId);
            newPredictor.guid = oldPredictor.id;
            newPredictor.name = oldPredictor.name;
            newPredictor.description = oldPredictor.name;
            newPredictor.production = oldPredictor.production;
            newPredictor.predictorType = oldPredictor.predictorType;
            newPredictor.weatherDataType = oldPredictor.weatherDataType;
            newPredictor.weatherStationId = oldPredictor.weatherStationId;
            newPredictor.weatherStationName = oldPredictor.weatherStationName;
            newPredictor.heatingBaseTemperature = oldPredictor.heatingBaseTemperature;
            newPredictor.coolingBaseTemperature = oldPredictor.coolingBaseTemperature;
            newPredictor.weatherDataWarning = oldPredictor.weatherDataWarning;
            await firstValueFrom(this.predictorDbService.addWithObservable(newPredictor));
            predictorGUIDs.push({ oldId: oldPredictor.id, newId: newPredictor.guid, predictorName: newPredictor.name, facilityId: facilityGuid.newId });
            for (let entryIndex = 0; entryIndex < facilityEntries.length; entryIndex++) {
              let oldEntry: IdbPredictorEntryDeprecated = facilityEntries[entryIndex];
              let oldEntryPredictor: PredictorDataDeprecated = oldEntry.predictors.find(predictor => {
                return predictor.id == newPredictor.guid
              });
              let newIdbPredictorData: IdbPredictorData = getNewIdbPredictorData(newPredictor, undefined);
              let oldEntryDate: Date = new Date(oldEntry.date);
              newIdbPredictorData.month = oldEntryDate.getMonth() + 1;
              newIdbPredictorData.year = oldEntryDate.getFullYear();
              newIdbPredictorData.amount = oldEntryPredictor.amount;
              newIdbPredictorData.weatherDataWarning = oldEntryPredictor.weatherDataWarning;
              newIdbPredictorData.weatherOverride = oldEntryPredictor.weatherOverride;
              await firstValueFrom(this.predictorDataDbService.addWithObservable(newIdbPredictorData));
            }
          }
        }
      }
    }



    if (backupFile.predictors) {
      for (let i = 0; i < backupFile.predictors.length; i++) {
        let predictor: IdbPredictor = backupFile.predictors[i];
        let newGUID: string = this.getGUID();
        let facilityId: string = this.getNewId(predictor.facilityId, facilityGUIDs);
        predictorGUIDs.push({
          newId: newGUID,
          oldId: predictor.guid,
          predictorName: predictor.name,
          facilityId: facilityId
        });
        delete predictor.id;
        predictor.guid = newGUID;
        predictor.accountId = accountGUIDs.newId;
        predictor.facilityId = facilityId;
        await firstValueFrom(this.predictorDbService.addWithObservable(predictor));
      }
    }

    let predictorV2GUIDs: Array<{ oldId: string, newId: string }> = new Array();
    if (backupFile.predictorDataV2) {
      for (let i = 0; i < backupFile.predictorDataV2.length; i++) {
        let predictorData: IdbPredictorData = backupFile.predictorDataV2[i];
        let newGUID: string = this.getGUID();
        predictorV2GUIDs.push({
          newId: newGUID,
          oldId: predictorData.guid
        });
        delete predictorData.id;
        predictorData.guid = newGUID;
        predictorData.accountId = accountGUIDs.newId;
        if (predictorData['date']) {
          const [datePart] = predictorData['date'].split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          predictorData.year = year;
          predictorData.month = month;
          predictorData.migratedDates = true;
        }
        predictorData.facilityId = this.getNewId(predictorData.facilityId, facilityGUIDs);
        predictorData.predictorId = this.getNewId(predictorData.predictorId, predictorGUIDs);
        await firstValueFrom(this.predictorDataDbService.addWithObservable(predictorData));
      }
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let facilityAnalysisGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    let bankedItems: Array<IdbAnalysisItem> = new Array();
    for (let i = 0; i < backupFile.facilityAnalysisItems.length; i++) {
      let facilityAnalysisItem: IdbAnalysisItem = backupFile.facilityAnalysisItems[i];
      let newGUID: string = this.getGUID();
      facilityAnalysisGUIDs.push({
        newId: newGUID,
        oldId: facilityAnalysisItem.guid
      });
      delete facilityAnalysisItem.id;
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
                let facilityPredictorNewIds: { oldId: string, newId: string, predictorName: string, facilityId: string } = predictorGUIDs.find(predictor => {
                  return predictor.predictorName === variable.name && predictor.facilityId === facilityAnalysisItem.facilityId;
                });
                if (facilityPredictorNewIds) {
                  variable.id = facilityPredictorNewIds.newId;
                }
              }
            })
            return this.getTrimmedModel(model);
          })
        }
        group.predictorVariables.forEach(variable => {
          variable.id = this.getNewId(variable.id, predictorGUIDs);
        });
      });
      facilityAnalysisItem = await firstValueFrom(this.analysisDbService.addWithObservable(facilityAnalysisItem));
      if (facilityAnalysisItem.hasBanking) {
        bankedItems.push(facilityAnalysisItem);
      }
    }

    for (let i = 0; i < bankedItems.length; i++) {
      let facilityAnalysisItem: IdbAnalysisItem = bankedItems[i];
      if (facilityAnalysisItem.hasBanking) {
        facilityAnalysisItem.bankedAnalysisItemId = this.getNewId(facilityAnalysisItem.bankedAnalysisItemId, facilityAnalysisGUIDs);
        await firstValueFrom(this.analysisDbService.updateWithObservable(facilityAnalysisItem));
      }
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let accountAnalysisGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.accountAnalysisItems.length; i++) {
      let accountAnalysisItem: IdbAccountAnalysisItem = backupFile.accountAnalysisItems[i];
      let newGUID: string = this.getGUID();
      accountAnalysisGUIDs.push({
        newId: newGUID,
        oldId: accountAnalysisItem.guid
      });
      delete accountAnalysisItem.id;
      accountAnalysisItem.guid = newGUID;
      accountAnalysisItem.accountId = accountGUIDs.newId;
      accountAnalysisItem.facilityAnalysisItems.forEach(item => {
        item.facilityId = this.getNewId(item.facilityId, facilityGUIDs);
        if (item.analysisItemId) {
          item.analysisItemId = this.getNewId(item.analysisItemId, facilityAnalysisGUIDs);
        }
      });
      await firstValueFrom(this.accountAnalysisDbService.addWithObservable(accountAnalysisItem));
    }

    // this.loadingService.setCurrentLoadingIndex(++currIdx);
    // this.loadingService.addLoadingMessage('Adding Custom Emissions');
    for (let i = 0; i < backupFile.customEmissionsItems?.length; i++) {
      let customEmissionsItem: IdbCustomEmissionsItem = backupFile.customEmissionsItems[i];
      customEmissionsItem.accountId = accountGUIDs.newId;
      delete customEmissionsItem.id;
      await firstValueFrom(this.customEmissionsDbService.addWithObservable(customEmissionsItem));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    for (let i = 0; i < backupFile.customFuels?.length; i++) {
      let customFuel: IdbCustomFuel = backupFile.customFuels[i];
      customFuel.accountId = accountGUIDs.newId;
      delete customFuel.id;
      await firstValueFrom(this.customFuelDbService.addWithObservable(customFuel));
    }

    // this.loadingService.setCurrentLoadingIndex(++currIdx);
    // this.loadingService.addLoadingMessage('Adding Custom GWPs');
    for (let i = 0; i < backupFile.customGWPs?.length; i++) {
      let customGWP: IdbCustomGWP = backupFile.customGWPs[i];
      customGWP.accountId = accountGUIDs.newId;
      delete customGWP.id;
      await firstValueFrom(this.customGWPDbService.addWithObservable(customGWP));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    for (let i = 0; i < backupFile.accountReports?.length; i++) {
      let accountReport: IdbAccountReport = backupFile.accountReports[i];
      accountReport.guid = this.getGUID();
      delete accountReport.id;
      accountReport.accountId = accountGUIDs.newId;
      accountReport.dataOverviewReportSetup.includedFacilities.forEach(facility => {
        facility.facilityId = this.getNewId(facility.facilityId, facilityGUIDs);
      });
      if (accountReport.reportType == 'betterPlants') {
        accountReport.betterPlantsReportSetup.analysisItemId = this.getNewId(accountReport.betterPlantsReportSetup.analysisItemId, accountAnalysisGUIDs);
      } else {
        accountReport.betterPlantsReportSetup = {
          analysisItemId: undefined,
          includeFacilityNames: undefined,
          baselineAdjustmentNotes: undefined,
          modificationNotes: undefined,
        }
      }

      if (accountReport.betterClimateReportSetup) {
        if (accountReport.betterClimateReportSetup.includedFacilityGroups) {
          accountReport.betterClimateReportSetup.includedFacilityGroups.forEach(facilityGroup => {
            facilityGroup.facilityId = this.getNewId(facilityGroup.facilityId, facilityGUIDs);
            facilityGroup.groups.forEach(group => {
              group.groupId = this.getNewId(group.groupId, meterGroupGUIDs);
            })
          })
        }
      }

      if (accountReport.reportType == 'performance') {
        accountReport.performanceReportSetup.analysisItemId = this.getNewId(accountReport.performanceReportSetup.analysisItemId, accountAnalysisGUIDs);
      }
      await firstValueFrom(this.accountReportsDbService.addWithObservable(accountReport));
    }

    //facility reports
    this.loadingService.setLoadingMessage('Adding Facility Reports...');
    for (let i = 0; i < backupFile.facilityReports?.length; i++) {
      let facilityReport: IdbFacilityReport = backupFile.facilityReports[i];
      facilityReport.guid = this.getGUID();
      delete facilityReport.id;
      facilityReport.accountId = accountGUIDs.newId;
      facilityReport.facilityId = this.getNewId(facilityReport.facilityId, facilityGUIDs);
      facilityReport.analysisItemId = this.getNewId(facilityReport.analysisItemId, facilityAnalysisGUIDs);
      await firstValueFrom(this.facilityReportsDbService.addWithObservable(facilityReport));
    }

    //facility energy use groups
    this.loadingService.setLoadingMessage('Adding Facility Energy Use Groups...');
    let facilityEnergyUseGroupGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.facilityEnergyUseGroups?.length; i++) {
      let facilityEnergyUseGroup: IdbFacilityEnergyUseGroup = backupFile.facilityEnergyUseGroups[i];
      let newId: string = this.getGUID();
      facilityEnergyUseGroupGUIDs.push({
        oldId: facilityEnergyUseGroup.guid,
        newId: newId
      });
      delete facilityEnergyUseGroup.id;
      facilityEnergyUseGroup.guid = newId;
      facilityEnergyUseGroup.accountId = accountGUIDs.newId;
      facilityEnergyUseGroup.facilityId = this.getNewId(facilityEnergyUseGroup.facilityId, facilityGUIDs);
      await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(facilityEnergyUseGroup));
    }

    //facility energy use equipment
    this.loadingService.setLoadingMessage('Adding Facility Energy Use Equipment...');
    for (let i = 0; i < backupFile.facilityEnergyUseEquipment?.length; i++) {
      let facilityEnergyUseEquipment: IdbFacilityEnergyUseEquipment = backupFile.facilityEnergyUseEquipment[i];
      facilityEnergyUseEquipment.guid = this.getGUID();
      delete facilityEnergyUseEquipment.id;
      facilityEnergyUseEquipment.accountId = accountGUIDs.newId;
      facilityEnergyUseEquipment.facilityId = this.getNewId(facilityEnergyUseEquipment.facilityId, facilityGUIDs);
      facilityEnergyUseEquipment.energyUseGroupId = this.getNewId(facilityEnergyUseEquipment.energyUseGroupId, facilityEnergyUseGroupGUIDs);
      facilityEnergyUseEquipment.utilityMeterGroupIds = facilityEnergyUseEquipment.utilityMeterGroupIds.map(groupId => {
        return this.getNewId(groupId, meterGroupGUIDs);
      });
      await firstValueFrom(this.facilityEnergyUseEquipmentDbService.addWithObservable(facilityEnergyUseEquipment));
    }


    //update account selected analysis items
    let needsAccountUpdate: boolean = false;
    if (newAccount.selectedEnergyAnalysisId) {
      newAccount.selectedEnergyAnalysisId = this.getNewId(newAccount.selectedEnergyAnalysisId, accountAnalysisGUIDs);
      needsAccountUpdate = true;
    }
    if (newAccount.selectedWaterAnalysisId) {
      newAccount.selectedWaterAnalysisId = this.getNewId(newAccount.selectedWaterAnalysisId, accountAnalysisGUIDs);
      needsAccountUpdate = true;
    }
    if (needsAccountUpdate) {
      await firstValueFrom(this.accountDbService.updateWithObservable(newAccount));
    }
    //update facility analysis items
    for (let i = 0; i < backupFile.facilities.length; i++) {
      let facility: IdbFacility = backupFile.facilities[i];
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
        await firstValueFrom(this.facilityDbService.updateWithObservable(facility));
      }
    }

    return newAccount;
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

  async importFacilityBackupFile(backupFile: BackupFile, accountGUID: string, currIdx: number): Promise<{ facility: IdbFacility, index?: number }> {
    this.analyticsService.sendEvent('import_backup_file');
    delete backupFile.facility.id;
    backupFile.facility.accountId = accountGUID;
    let newFacilityGUID: string = this.getGUID();
    backupFile.facility.guid = newFacilityGUID;
    let newFacility: IdbFacility = await firstValueFrom(this.facilityDbService.addWithObservable(backupFile.facility));

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let meterGroupGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.groups.length; i++) {
      let group: IdbUtilityMeterGroup = backupFile.groups[i];
      let newGUID: string = this.getGUID();
      meterGroupGUIDs.push({
        newId: newGUID,
        oldId: group.guid
      });
      delete group.id;
      group.accountId = accountGUID;
      group.facilityId = newFacilityGUID;
      group.guid = newGUID;
      await firstValueFrom(this.utilityMeterGroupDbService.addWithObservable(group));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let meterGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.meters.length; i++) {
      let meter: IdbUtilityMeter = backupFile.meters[i];
      let newGUID: string = this.getGUID();
      meterGUIDs.push({
        newId: newGUID,
        oldId: meter.guid
      });
      delete meter.id;
      meter.accountId = accountGUID;
      meter.facilityId = newFacilityGUID;
      meter.guid = newGUID;
      meter.groupId = this.getNewId(meter.groupId, meterGroupGUIDs);
      await firstValueFrom(this.utilityMeterDbService.addWithObservable(meter));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let meterDataGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = backupFile.meterData[i];
      let newGUID: string = this.getGUID();
      meterDataGUIDs.push({
        newId: newGUID,
        oldId: meterData.guid
      });
      delete meterData.id;
      meterData.guid = newGUID;
      meterData.accountId = accountGUID;
      meterData.facilityId = newFacilityGUID;
      meterData.meterId = this.getNewId(meterData.meterId, meterGUIDs);
      if (meterData['readDate']) {
        meterData.year = new Date(meterData['readDate']).getFullYear();
        meterData.month = new Date(meterData['readDate']).getMonth() + 1;
        meterData.day = new Date(meterData['readDate']).getDate();
        meterData.migratedDates = true;
      }
      await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterData));
    }

    //TODO: migrate to new predictors..
    this.loadingService.setCurrentLoadingIndex(++currIdx);
    // let predictorDataGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    // for (let i = 0; i < backupFile.predictorData.length; i++) {
    //   let predictorEntryDeprecated: IdbPredictorEntryDeprecated = backupFile.predictorData[i];
    //   let newGUID: string = this.getGUID();
    //   predictorDataGUIDs.push({
    //     newId: newGUID,
    //     oldId: predictorEntryDeprecated.guid
    //   });
    //   delete predictorEntryDeprecated.id;
    //   predictorEntryDeprecated.guid = newGUID;
    //   predictorEntryDeprecated.accountId = accountGUID;
    //   predictorEntryDeprecated.facilityId = newFacilityGUID;
    //   predictorEntryDeprecated.date = this.getImportDate(predictorEntryDeprecated.date);
    //   await firstValueFrom(this.predictorsDbServiceDeprecated.addWithObservable(predictorEntryDeprecated));
    // }

    let predictorGUIDs: Array<{ oldId: string, newId: string, predictorName: string, facilityId: string }> = new Array();
    if (backupFile.predictorData.length > 0) {
      // let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let predictorEntries: Array<IdbPredictorEntryDeprecated> = backupFile.predictorData;
      // let facilityGuid: { oldId: string, newId: string } = facilityGUIDs[index];
      //IDs updated above. use old id when removing
      let facilityEntries: Array<IdbPredictorEntryDeprecated> = predictorEntries.filter(entry => {
        return entry.facilityId == newFacilityGUID;
      });
      if (facilityEntries.length > 0) {
        let predictorDataDep: Array<PredictorDataDeprecated> = facilityEntries[0].predictors;
        for (let i = 0; i < predictorDataDep.length; i++) {
          let oldPredictor: PredictorDataDeprecated = predictorDataDep[i];
          let newPredictor: IdbPredictor = getNewIdbPredictor(accountGUID, newFacilityGUID);
          newPredictor.guid = oldPredictor.id;
          newPredictor.name = oldPredictor.name;
          newPredictor.description = oldPredictor.name;
          newPredictor.production = oldPredictor.production;
          newPredictor.predictorType = oldPredictor.predictorType;
          newPredictor.weatherDataType = oldPredictor.weatherDataType;
          newPredictor.weatherStationId = oldPredictor.weatherStationId;
          newPredictor.weatherStationName = oldPredictor.weatherStationName;
          newPredictor.heatingBaseTemperature = oldPredictor.heatingBaseTemperature;
          newPredictor.coolingBaseTemperature = oldPredictor.coolingBaseTemperature;
          newPredictor.weatherDataWarning = oldPredictor.weatherDataWarning;
          await firstValueFrom(this.predictorDbService.addWithObservable(newPredictor));
          predictorGUIDs.push({ oldId: oldPredictor.id, newId: newPredictor.guid, predictorName: newPredictor.name, facilityId: newFacilityGUID });
          for (let entryIndex = 0; entryIndex < facilityEntries.length; entryIndex++) {
            let oldEntry: IdbPredictorEntryDeprecated = facilityEntries[entryIndex];
            let oldEntryPredictor: PredictorDataDeprecated = oldEntry.predictors.find(predictor => {
              return predictor.id == newPredictor.guid
            });
            let newIdbPredictorData: IdbPredictorData = getNewIdbPredictorData(newPredictor, undefined);
            let oldEntryDate: Date = new Date(oldEntry.date);
            newIdbPredictorData.month = oldEntryDate.getMonth() + 1;
            newIdbPredictorData.year = oldEntryDate.getFullYear();
            newIdbPredictorData.amount = oldEntryPredictor.amount;
            newIdbPredictorData.weatherDataWarning = oldEntryPredictor.weatherDataWarning;
            newIdbPredictorData.weatherOverride = oldEntryPredictor.weatherOverride;
            await firstValueFrom(this.predictorDataDbService.addWithObservable(newIdbPredictorData));
          }
        }
      }
    }

    if (backupFile.predictors) {
      for (let i = 0; i < backupFile.predictors.length; i++) {
        let predictor: IdbPredictor = backupFile.predictors[i];
        let newGUID: string = this.getGUID();
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
        await firstValueFrom(this.predictorDbService.addWithObservable(predictor));
      }
    }

    let predictorV2GUIDs: Array<{ oldId: string, newId: string }> = new Array();
    if (backupFile.predictorDataV2) {
      for (let i = 0; i < backupFile.predictorDataV2.length; i++) {
        let predictorData: IdbPredictorData = backupFile.predictorDataV2[i];
        let newGUID: string = this.getGUID();
        predictorV2GUIDs.push({
          newId: newGUID,
          oldId: predictorData.guid
        });
        delete predictorData.id;
        if (predictorData['date']) {
          predictorData.year = new Date(predictorData['date']).getFullYear();
          predictorData.month = new Date(predictorData['date']).getMonth() + 1;
          predictorData.migratedDates = true;
        }

        predictorData.guid = newGUID;
        predictorData.accountId = accountGUID;
        predictorData.facilityId = newFacilityGUID;
        predictorData.predictorId = this.getNewId(predictorData.predictorId, predictorGUIDs);
        await firstValueFrom(this.predictorDataDbService.addWithObservable(predictorData));
      }
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let facilityAnalysisGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.facilityAnalysisItems.length; i++) {
      let facilityAnalysisItem: IdbAnalysisItem = backupFile.facilityAnalysisItems[i];
      let newGUID: string = this.getGUID();
      facilityAnalysisGUIDs.push({
        newId: newGUID,
        oldId: facilityAnalysisItem.guid
      });
      delete facilityAnalysisItem.id;
      facilityAnalysisItem.guid = newGUID;
      facilityAnalysisItem.accountId = accountGUID;
      facilityAnalysisItem.facilityId = newFacilityGUID;
      facilityAnalysisItem.groups.forEach(group => {
        group.idbGroupId = this.getNewId(group.idbGroupId, meterGroupGUIDs);
        group.predictorVariables.forEach(variable => {
          variable.id = this.getNewId(variable.id, predictorGUIDs);
        });
        group.models.forEach(model => {
          model.predictorVariables.forEach(variable => {
            variable.id = this.getNewId(variable.id, predictorGUIDs);
            if (variable.id == undefined) {
              let facilityPredictorNewIds: { oldId: string, newId: string, predictorName: string, facilityId: string } = predictorGUIDs.find(predictor => {
                return predictor.predictorName === variable.name && predictor.facilityId === newFacilityGUID;
              });
              if (facilityPredictorNewIds) {
                variable.id = facilityPredictorNewIds.newId;
              }
            }
          })
        });
      });
      await firstValueFrom(this.analysisDbService.addWithObservable(facilityAnalysisItem));
    }

    // this.loadingService.setCurrentLoadingIndex(++currIdx);
    // this.loadingService.addLoadingMessage('Adding Custom Emissions');
    for (let i = 0; i < backupFile.customEmissionsItems.length; i++) {
      let customEmissionsItem: IdbCustomEmissionsItem = backupFile.customEmissionsItems[i];
      customEmissionsItem.accountId = accountGUID;
      delete customEmissionsItem.id;
      await firstValueFrom(this.customEmissionsDbService.addWithObservable(customEmissionsItem));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    for (let i = 0; i < backupFile.customFuels.length; i++) {
      let customFuel: IdbCustomFuel = backupFile.customFuels[i];
      customFuel.accountId = accountGUID;
      delete customFuel.id;
      await firstValueFrom(this.customFuelDbService.addWithObservable(customFuel));
    }

    // this.loadingService.setCurrentLoadingIndex(++currIdx);
    // this.loadingService.addLoadingMessage('Adding Custom GWPs');
    for (let i = 0; i < backupFile.customGWPs.length; i++) {
      let customGWP: IdbCustomGWP = backupFile.customGWPs[i];
      customGWP.accountId = accountGUID;
      delete customGWP.id;
      await firstValueFrom(this.customGWPDbService.addWithObservable(customGWP));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems.push({
        facilityId: newFacilityGUID,
        analysisItemId: undefined
      });
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
    }

    this.loadingService.setCurrentLoadingIndex(++currIdx);
    let accountReports: Array<IdbAccountReport> = this.accountReportsDbService.accountReports.getValue();
    for (let reportIndex = 0; reportIndex < accountReports.length; reportIndex++) {
      accountReports[reportIndex].dataOverviewReportSetup.includedFacilities.push({
        facilityId: newFacilityGUID,
        included: false,
        includedGroups: backupFile.groups.map(group => {
          return {
            groupId: this.getNewId(group.guid, meterGroupGUIDs),
            include: true
          }
        })
      });
      await firstValueFrom(this.accountReportsDbService.updateWithObservable(accountReports[reportIndex]));
    }

    //facility reports
    this.loadingService.setCurrentLoadingIndex(++currIdx);
    this.loadingService.setLoadingMessage('Adding Facility Reports...');
    for (let i = 0; i < backupFile.facilityReports?.length; i++) {
      let facilityReport: IdbFacilityReport = backupFile.facilityReports[i];
      facilityReport.guid = this.getGUID();
      delete facilityReport.id;
      facilityReport.accountId = accountGUID;
      facilityReport.facilityId = newFacilityGUID;
      facilityReport.analysisItemId = this.getNewId(facilityReport.analysisItemId, facilityAnalysisGUIDs);
      await firstValueFrom(this.facilityReportsDbService.addWithObservable(facilityReport));
    }

    //facility energy use groups
    this.loadingService.setCurrentLoadingIndex(++currIdx);
    this.loadingService.setLoadingMessage('Adding Facility Energy Use Groups...');
    let facilityEnergyUseGroupGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.facilityEnergyUseGroups?.length; i++) {
      let facilityEnergyUseGroup: IdbFacilityEnergyUseGroup = backupFile.facilityEnergyUseGroups[i];
      let newGUID: string = this.getGUID();
      facilityEnergyUseGroupGUIDs.push({
        newId: newGUID,
        oldId: facilityEnergyUseGroup.guid
      });
      delete facilityEnergyUseGroup.id;
      facilityEnergyUseGroup.guid = newGUID;
      facilityEnergyUseGroup.accountId = accountGUID;
      facilityEnergyUseGroup.facilityId = newFacilityGUID;
      await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(facilityEnergyUseGroup));
    }

    //facility energy use equipment
    this.loadingService.setCurrentLoadingIndex(++currIdx);
    this.loadingService.setLoadingMessage('Adding Facility Energy Use Equipment...');
    for (let i = 0; i < backupFile.facilityEnergyUseEquipment?.length; i++) {
      let facilityEnergyUseEquipment: IdbFacilityEnergyUseEquipment = backupFile.facilityEnergyUseEquipment[i];
      facilityEnergyUseEquipment.guid = this.getGUID();
      delete facilityEnergyUseEquipment.id;
      facilityEnergyUseEquipment.accountId = accountGUID;
      facilityEnergyUseEquipment.facilityId = newFacilityGUID;
      facilityEnergyUseEquipment.energyUseGroupId = this.getNewId(facilityEnergyUseEquipment.energyUseGroupId, facilityEnergyUseGroupGUIDs);
      facilityEnergyUseEquipment.utilityMeterGroupIds = facilityEnergyUseEquipment.utilityMeterGroupIds.map(groupId => {
        return this.getNewId(groupId, meterGroupGUIDs);
      });
      await firstValueFrom(this.facilityEnergyUseEquipmentDbService.addWithObservable(facilityEnergyUseEquipment));
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
      await firstValueFrom(this.facilityDbService.updateWithObservable(newFacility));
    }
    return { facility: newFacility, index: currIdx };
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

  //only export selected model in analysis items
  trimAnalysisModels(analysisItems: Array<IdbAnalysisItem>): Array<IdbAnalysisItem> {
    analysisItems.forEach(item => {
      item.groups.forEach(group => {
        if (group.analysisType == 'regression' && group.models) {
          group.models = group.models.filter(model => {
            return model.modelId == group.selectedModelId;
          });
        } else {
          group.models = [];
        }
      });
    });
    return analysisItems;
  }
}

export interface BackupFile {
  account: IdbAccount,
  facilities: Array<IdbFacility>,
  facility: IdbFacility,
  meters: Array<IdbUtilityMeter>,
  meterData: Array<IdbUtilityMeterData>,
  groups: Array<IdbUtilityMeterGroup>,
  accountReports: Array<IdbAccountReport>,
  accountAnalysisItems: Array<IdbAccountAnalysisItem>,
  facilityAnalysisItems: Array<IdbAnalysisItem>,
  predictorData: Array<IdbPredictorEntryDeprecated>,
  predictorDataV2: Array<IdbPredictorData>,
  predictors: Array<IdbPredictor>,
  customEmissionsItems: Array<IdbCustomEmissionsItem>,
  customFuels: Array<IdbCustomFuel>,
  customGWPs: Array<IdbCustomGWP>,
  origin: "VERIFI",
  backupFileType: "Account" | "Facility",
  timeStamp: Date,
  dataBackupId: string,
  facilityReports: Array<IdbFacilityReport>,
  facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup>
  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>
}


