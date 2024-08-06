import { Injectable } from '@angular/core';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { PredictordbService } from '../../indexedDB/predictors-db.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbCustomEmissionsItem, IdbCustomFuel, IdbCustomGWP, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from '../../models/idb';
import { LoadingService } from '../../core-components/loading/loading.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { firstValueFrom } from 'rxjs';
import { ElectronBackupsDbService } from 'src/app/indexedDB/electron-backups-db.service';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';

@Injectable({
  providedIn: 'root'
})
export class BackupDataService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService, private predictorsDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService, private loadingService: LoadingService, private accountAnalysisDbService: AccountAnalysisDbService,
    private analysisDbService: AnalysisDbService, private accountReportsDbService: AccountReportDbService,
    private electronBackupsDbService: ElectronBackupsDbService,
    private analyticsService: AnalyticsService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService) { }


  backupAccount() {
    let backupFile: BackupFile = this.getAccountBackupFile();
    let backupName: string = backupFile.account.name.split(' ').join('_') + '_Backup_';
    this.downloadBackup(backupFile, backupName);
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
      facilityAnalysisItems: this.analysisDbService.accountAnalysisItems.getValue(),
      predictorData: this.predictorsDbService.accountPredictorEntries.getValue(),
      customEmissionsItems: this.customEmissionsDbService.accountEmissionsItems.getValue(),
      customFuels: this.customFuelDbService.accountCustomFuels.getValue(),
      customGWPs: this.customGWPDbService.accountCustomGWPs.getValue(),
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

    let predictorData: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    let facilityPredictorData: Array<IdbPredictorEntry> = predictorData.filter(meter => { return meter.facilityId == facility.guid });



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
      predictorData: facilityPredictorData,
      customEmissionsItems: this.customEmissionsDbService.accountEmissionsItems.getValue(),
      customFuels: this.customFuelDbService.accountCustomFuels.getValue(),
      customGWPs: this.customGWPDbService.accountCustomGWPs.getValue(),
      backupFileType: "Facility",
      origin: "VERIFI",
      timeStamp: new Date(),
      dataBackupId: Math.random().toString(36).substr(2, 9)
    }
    let backupName: string = backupFile.facility.name.split(' ').join('_') + '_Backup_';
    this.downloadBackup(backupFile, backupName);
  }

  downloadBackup(backupFile: BackupFile, backupName: string) {
    let stringifyData = JSON.stringify(backupFile);
    let dlLink = window.document.createElement("a");
    let dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(stringifyData);
    dlLink.setAttribute("href", dataStr);
    const date = new Date();
    const dateStr = (date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getFullYear();
    let name = backupName + dateStr;
    dlLink.setAttribute('download', name + '.json');
    dlLink.click();
  }

  getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getNewId(oldId: string, GUIDs: Array<{ oldId: string, newId: string }>): string {
    let GUID: string = GUIDs.find(id => { return id.oldId == oldId })?.newId;
    return GUID;
  }

  async importAccountBackupFile(backupFile: BackupFile): Promise<IdbAccount> {
    this.analyticsService.sendEvent('import_backup_file');
    this.loadingService.setLoadingMessage('Adding Account...');
    let accountGUIDs: { oldId: string, newId: string } = {
      oldId: backupFile.account.guid,
      newId: this.getGUID()
    }
    delete backupFile.account.id;
    backupFile.account.guid = accountGUIDs.newId;
    let newAccount: IdbAccount = await firstValueFrom(this.accountDbService.addWithObservable(backupFile.account));
    this.loadingService.setLoadingMessage('Adding Facilities...');
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
      await firstValueFrom(this.facilityDbService.addWithObservable(facility));
    }

    this.loadingService.setLoadingMessage('Adding Meter Groups...');
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

    this.loadingService.setLoadingMessage('Adding Meters...');
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

    this.loadingService.setLoadingMessage('Adding Meter Data...');
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
      meterData.readDate = this.getImportDate(meterData.readDate);
      await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterData));
    }


    this.loadingService.setLoadingMessage('Adding Predictors...');
    let predictorDataGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.predictorData.length; i++) {
      let predictorEntry: IdbPredictorEntry = backupFile.predictorData[i];
      let newGUID: string = this.getGUID();
      predictorDataGUIDs.push({
        newId: newGUID,
        oldId: predictorEntry.guid
      });
      delete predictorEntry.id;
      predictorEntry.guid = newGUID;
      predictorEntry.accountId = accountGUIDs.newId;
      predictorEntry.facilityId = this.getNewId(predictorEntry.facilityId, facilityGUIDs);
      predictorEntry.date = this.getImportDate(predictorEntry.date);
      await firstValueFrom(this.predictorsDbService.addWithObservable(predictorEntry));
    }

    this.loadingService.setLoadingMessage('Adding Facility Analysis Items...');
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
      facilityAnalysisItem.accountId = accountGUIDs.newId;
      facilityAnalysisItem.facilityId = this.getNewId(facilityAnalysisItem.facilityId, facilityGUIDs);
      facilityAnalysisItem.groups.forEach(group => {
        group.idbGroupId = this.getNewId(group.idbGroupId, meterGroupGUIDs);
        if (group.models) {
          group.models = group.models.map(model => {
            return this.getTrimmedModel(model);
          })
        }
        // group.predictorVariables.forEach(variable => {
        //   variable.id = this.getNewId(variable.id, predictorDataGUIDs);
        // });
      });
      await firstValueFrom(this.analysisDbService.addWithObservable(facilityAnalysisItem));
    }


    this.loadingService.setLoadingMessage('Adding Account Analysis Items...');
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


    this.loadingService.setLoadingMessage('Adding Custom Emissions...');
    for (let i = 0; i < backupFile.customEmissionsItems?.length; i++) {
      let customEmissionsItem: IdbCustomEmissionsItem = backupFile.customEmissionsItems[i];
      customEmissionsItem.accountId = accountGUIDs.newId;
      delete customEmissionsItem.id;
      await firstValueFrom(this.customEmissionsDbService.addWithObservable(customEmissionsItem));
    }

    this.loadingService.setLoadingMessage('Adding Custom Fuels...');
    for (let i = 0; i < backupFile.customFuels?.length; i++) {
      let customFuel: IdbCustomFuel = backupFile.customFuels[i];
      customFuel.accountId = accountGUIDs.newId;
      delete customFuel.id;
      await firstValueFrom(this.customFuelDbService.addWithObservable(customFuel));
    }

    this.loadingService.setLoadingMessage('Adding Custom GWPs...');
    for (let i = 0; i < backupFile.customGWPs?.length; i++) {
      let customGWP: IdbCustomGWP = backupFile.customGWPs[i];
      customGWP.accountId = accountGUIDs.newId;
      delete customGWP.id;
      await firstValueFrom(this.customGWPDbService.addWithObservable(customGWP));
    }


    this.loadingService.setLoadingMessage('Adding Account Reports...');
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

      if(accountReport.betterClimateReportSetup){
        accountReport.betterClimateReportSetup.includedFacilityGroups.forEach(facilityGroup => {
          facilityGroup.facilityId = this.getNewId(facilityGroup.facilityId, facilityGUIDs);
          facilityGroup.groups.forEach(group => {
            group.groupId = this.getNewId(group.groupId, meterGroupGUIDs);
          })
        })
      }

      if (accountReport.reportType == 'performance') {
        accountReport.performanceReportSetup.analysisItemId = this.getNewId(accountReport.performanceReportSetup.analysisItemId, accountAnalysisGUIDs);
      }
      await firstValueFrom(this.accountReportsDbService.addWithObservable(accountReport));
    }
    return newAccount;
  }

  async importFacilityBackupFile(backupFile: BackupFile, accountGUID: string): Promise<IdbFacility> {
    this.analyticsService.sendEvent('import_backup_file');
    this.loadingService.setLoadingMessage('Adding Facility...');
    delete backupFile.facility.id;
    backupFile.facility.accountId = accountGUID;
    let newFacilityGUID: string = this.getGUID();
    backupFile.facility.guid = newFacilityGUID;
    let newFacility: IdbFacility = await firstValueFrom(this.facilityDbService.addWithObservable(backupFile.facility));

    this.loadingService.setLoadingMessage('Adding Meter Groups...');
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

    this.loadingService.setLoadingMessage('Adding Meters...');
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

    this.loadingService.setLoadingMessage('Adding Meter Data...');
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
      meterData.readDate = this.getImportDate(meterData.readDate);
      await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterData));
    }

    this.loadingService.setLoadingMessage('Adding Facility Analysis Items...');
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
      });
      await firstValueFrom(this.analysisDbService.addWithObservable(facilityAnalysisItem));
    }


    this.loadingService.setLoadingMessage('Adding Predictors...');
    let predictorDataGUIDs: Array<{ oldId: string, newId: string }> = new Array();
    for (let i = 0; i < backupFile.predictorData.length; i++) {
      let predictorEntry: IdbPredictorEntry = backupFile.predictorData[i];
      let newGUID: string = this.getGUID();
      predictorDataGUIDs.push({
        newId: newGUID,
        oldId: predictorEntry.guid
      });
      delete predictorEntry.id;
      predictorEntry.guid = newGUID;
      predictorEntry.accountId = accountGUID;
      predictorEntry.facilityId = newFacilityGUID;
      predictorEntry.date = this.getImportDate(predictorEntry.date);
      await firstValueFrom(this.predictorsDbService.addWithObservable(predictorEntry));
    }

    this.loadingService.setLoadingMessage('Adding Custom Emissions...');
    for (let i = 0; i < backupFile.customEmissionsItems.length; i++) {
      let customEmissionsItem: IdbCustomEmissionsItem = backupFile.customEmissionsItems[i];
      customEmissionsItem.accountId = accountGUID;
      delete customEmissionsItem.id;
      await firstValueFrom(this.customEmissionsDbService.addWithObservable(customEmissionsItem));
    }

    this.loadingService.setLoadingMessage('Adding Custom Fuels...');
    for (let i = 0; i < backupFile.customFuels.length; i++) {
      let customFuel: IdbCustomFuel = backupFile.customFuels[i];
      customFuel.accountId = accountGUID;
      delete customFuel.id;
      await firstValueFrom(this.customFuelDbService.addWithObservable(customFuel));
    }

    this.loadingService.setLoadingMessage('Adding Custom GWPs...');
    for (let i = 0; i < backupFile.customGWPs.length; i++) {
      let customGWP: IdbCustomGWP = backupFile.customGWPs[i];
      customGWP.accountId = accountGUID;
      delete customGWP.id;
      await firstValueFrom(this.customGWPDbService.addWithObservable(customGWP));
    }

    this.loadingService.setLoadingMessage('Updating Account Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems.push({
        facilityId: newFacilityGUID,
        analysisItemId: undefined
      });
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
    }

    this.loadingService.setLoadingMessage('Updating Account Reports...');
    let accountReports: Array<IdbAccountReport> = this.accountReportsDbService.accountReports.getValue();
    for (let reportIndex = 0; reportIndex < accountReports.length; reportIndex++) {
      accountReports[reportIndex].dataOverviewReportSetup.includedFacilities.push({
        facilityId: newFacilityGUID,
        included: false
      });
      await firstValueFrom(this.accountReportsDbService.updateWithObservable(accountReports[reportIndex]));
    }

    return newFacility;
  }

  async deleteFacilityData(facility: IdbFacility) {
    await firstValueFrom(this.facilityDbService.deleteWithObservable(facility.id));
    //delete meters
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facility.guid });
    for (let i = 0; i < facilityMeters.length; i++) {
      await firstValueFrom(this.utilityMeterDbService.deleteIndexWithObservable(facilityMeters[i].id));
    }
    //delete meter data
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == facility.guid });
    for (let i = 0; i < facilityMeterData.length; i++) {
      await firstValueFrom(this.utilityMeterDataDbService.deleteWithObservable(facilityMeterData[i].id));
    }
    //delete predictors
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(predictor => { return predictor.facilityId == facility.guid });
    for (let i = 0; i < facilityPredictorEntries.length; i++) {
      await firstValueFrom(this.predictorsDbService.deleteIndexWithObservable(facilityPredictorEntries[i].id));
    }
    //delete meter groups
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == facility.guid });
    for (let i = 0; i < facilityMeterGroups.length; i++) {
      await firstValueFrom(this.utilityMeterGroupDbService.deleteWithObservable(facilityMeterGroups[i].id));
    }

    //delete facility analysis
    let accountFacilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountFacilityAnalysisItems.filter(item => { return item.facilityId == facility.guid });
    for (let i = 0; i < facilityAnalysisItems.length; i++) {
      await firstValueFrom(this.analysisDbService.deleteWithObservable(facilityAnalysisItems[i].id));
    }

    //update reports
    let reports: Array<IdbAccountReport> = this.accountReportsDbService.accountReports.getValue();
    for (let i = 0; i < reports.length; i++) {
      reports[i].dataOverviewReportSetup.includedFacilities = reports[i].dataOverviewReportSetup.includedFacilities.filter(option => { return option.facilityId != facility.guid });
      await firstValueFrom(this.accountReportsDbService.updateWithObservable(reports[i]));
    }
    //update account analysis
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems = accountAnalysisItems[i].facilityAnalysisItems.filter(option => { return option.facilityId != facility.guid });
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
    }
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
      SEPValidation: model.SEPValidation
    }
  }

  trimGroups(groups: Array<IdbUtilityMeterGroup>): Array<IdbUtilityMeterGroup> {
    return groups.map(group => {
      delete group.combinedMonthlyData;
      return group;
    })
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
  predictorData: Array<IdbPredictorEntry>,
  customEmissionsItems: Array<IdbCustomEmissionsItem>,
  customFuels: Array<IdbCustomFuel>,
  customGWPs: Array<IdbCustomGWP>,
  origin: "VERIFI",
  backupFileType: "Account" | "Facility",
  timeStamp: Date,
  dataBackupId: string
}


