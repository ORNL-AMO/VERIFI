import { Injectable } from '@angular/core';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { PredictordbService } from '../../indexedDB/predictors-db.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from '../../models/idb';
import { LoadingService } from '../../core-components/loading/loading.service';
import { OverviewReportOptionsDbService } from '../../indexedDB/overview-report-options-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';

@Injectable({
  providedIn: 'root'
})
export class BackupDataService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService, private predictorsDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService, private loadingService: LoadingService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private analysisDbService: AnalysisDbService) { }


  backupAccount() {
    let backupFile: BackupFile = {
      account: this.accountDbService.selectedAccount.getValue(),
      facilities: this.facilityDbService.accountFacilities.getValue(),
      meters: this.utilityMeterDbService.accountMeters.getValue(),
      meterData: this.utilityMeterDataDbService.accountMeterData.getValue(),
      groups: this.utilityMeterGroupDbService.accountMeterGroups.getValue(),
      reports: this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue(),
      accountAnalysisItems: this.accountAnalysisDbService.accountAnalysisItems.getValue(),
      facilityAnalysisItems: this.analysisDbService.accountAnalysisItems.getValue(),
      predictorData: this.predictorsDbService.accountPredictorEntries.getValue(),
      facility: undefined,
      backupFileType: "Account",
      origin: "VERIFI"
    };

    let backupName: string = backupFile.account.name.split(' ').join('_') + '_Backup_';
    this.downloadBackup(backupFile, backupName);
  }

  backupFacility(facility: IdbFacility) {
    //TODO: filter data by facility
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => {return meter.facilityId == facility.guid});
   
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = meterData.filter(meter => {return meter.facilityId == facility.guid});
   
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityGroups: Array<IdbUtilityMeterGroup> = groups.filter(meter => {return meter.facilityId == facility.guid});
   
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = analysisItems.filter(meter => {return meter.facilityId == facility.guid});
   
    let predictorData: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    let facilityPredictorData: Array<IdbPredictorEntry> = predictorData.filter(meter => {return meter.facilityId == facility.guid});


    
    let backupFile: BackupFile = {
      account: undefined,
      facilities: undefined,
      facility: facility,
      meters: facilityMeters,
      meterData: facilityMeterData,
      groups: facilityGroups,
      reports: undefined,
      accountAnalysisItems: undefined,
      facilityAnalysisItems: facilityAnalysisItems,
      predictorData: facilityPredictorData,
      backupFileType: "Facility",
      origin: "VERIFI"
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

  // getAccountBackup(): AccountBackup {
  //   let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //   account.lastBackup = new Date();
  //   this.accountDbService.update(account);
  //   let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

  //   let facilitiesBackups: Array<FacilityBackup> = new Array();
  //   facilities.forEach(facility => {
  //     let facilityBackup: FacilityBackup = this.getFacilityBackup(facility);
  //     facilitiesBackups.push(facilityBackup);
  //   });
  //   return {
  //     account: account,
  //     facilities: facilitiesBackups
  //   }
  // }

  // getFacilityBackup(facility: IdbFacility): FacilityBackup {
  //   let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
  //   let predictors: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();

  //   let meterBackups: Array<MeterBackup> = new Array();
  //   meters.forEach(meter => {
  //     if (meter.facilityId == facility.guid) {
  //       let meterBackup: MeterBackup = this.getMeterBackup(meter);
  //       meterBackups.push(meterBackup);
  //     }
  //   });
  //   let facilityPredictors: Array<IdbPredictorEntry> = predictors.filter(predictor => { return predictor.facilityId == facility.guid });
  //   return {
  //     facility: facility,
  //     meters: meterBackups,
  //     predictors: facilityPredictors
  //   }
  // }


  // getMeterBackup(meter: IdbUtilityMeter): MeterBackup {
  //   let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
  //   let meterData: Array<IdbUtilityMeterData> = accountMeterData.filter(dataItem => { return dataItem.meterId == meter.guid });
  //   let meterGroup: IdbUtilityMeterGroup;
  //   if (meter.groupId) {
  //     let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
  //     meterGroup = accountMeterGroups.find(meterGroupItem => { return meterGroupItem.guid == meter.groupId });
  //   }
  //   return {
  //     meter: meter,
  //     meterData: meterData,
  //     meterGroup: meterGroup
  //   }
  // }

  getGUID():string {
    return Math.random().toString(36).substr(2, 9);
  }

  getNewId(oldId: string, GUIDs: Array<{oldId: string, newId: string}>): string{
    let GUID: string = GUIDs.find(id => {return id.oldId == oldId})?.newId;
    return GUID;
  }

  async importAccountBackupFile(backupFile: BackupFile): Promise<IdbAccount> {
    this.loadingService.setLoadingMessage('Adding Account...');
    let accountGUIDs: {oldId: string, newId: string} = {
      oldId: backupFile.account.guid,
      newId: this.getGUID()
    }
    delete backupFile.account.id;
    backupFile.account.guid = accountGUIDs.newId;
    let newAccount: IdbAccount = await this.accountDbService.addWithObservable(backupFile.account).toPromise();
    
    this.loadingService.setLoadingMessage('Adding Facilities...');
    let facilityGUIDs: Array<{oldId: string, newId: string}> = new Array();
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
      await this.facilityDbService.addWithObservable(facility).toPromise();
    }
    
    this.loadingService.setLoadingMessage('Adding Meter Groups...');
    let meterGroupGUIDs: Array<{oldId: string, newId: string}> = new Array();
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
      await this.utilityMeterGroupDbService.addWithObservable(group).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Meters...');
    let meterGUIDs: Array<{oldId: string, newId: string}> = new Array();
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
      await this.utilityMeterDbService.addWithObservable(meter).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Meter Data...');
    let meterDataGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
      await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
    }


    this.loadingService.setLoadingMessage('Adding Predictors...');
    let predictorDataGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
      await this.predictorsDbService.addWithObservable(predictorEntry).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Facility Analysis Items...');
    let facilityAnalysisGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
        // group.predictorVariables.forEach(variable => {
        //   variable.id = this.getNewId(variable.id, predictorDataGUIDs);
        // });
      });
      await this.analysisDbService.addWithObservable(facilityAnalysisItem).toPromise();
    }


    this.loadingService.setLoadingMessage('Adding Account Analysis Items...');
    let accountAnalysisGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
        if(item.analysisItemId){
          item.analysisItemId = this.getNewId(item.analysisItemId, facilityAnalysisGUIDs);
        }
      });
      await this.accountAnalysisDbService.addWithObservable(accountAnalysisItem).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Account Reports...');
    for (let i = 0; i < backupFile.reports.length; i++) {
      let reportOptions: IdbOverviewReportOptions = backupFile.reports[i];
      reportOptions.guid = this.getGUID();
      delete reportOptions.id;
      reportOptions.accountId = accountGUIDs.newId;
      reportOptions.reportOptions.facilities.forEach(facility => {
        facility.facilityId = this.getNewId(facility.facilityId, facilityGUIDs);
      });
      //TODO: Update with better plants
      await this.overviewReportOptionsDbService.addWithObservable(reportOptions).toPromise();
    }
    return newAccount;
  }

  async importFacilityBackupFile(backupFile: BackupFile, accountGUID: string): Promise<IdbFacility> {
    this.loadingService.setLoadingMessage('Adding Facility...');
    delete backupFile.facility.id;
    backupFile.facility.accountId = accountGUID;
    let newFacilityGUID: string = this.getGUID();
    backupFile.facility.guid = newFacilityGUID;
    let newFacility: IdbFacility = await this.facilityDbService.addWithObservable(backupFile.facility).toPromise();

    this.loadingService.setLoadingMessage('Adding Meter Groups...');
    let meterGroupGUIDs: Array<{oldId: string, newId: string}> = new Array();
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
      await this.utilityMeterGroupDbService.addWithObservable(group).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Meters...');
    let meterGUIDs: Array<{oldId: string, newId: string}> = new Array();
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
      await this.utilityMeterDbService.addWithObservable(meter).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Meter Data...');
    let meterDataGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
      await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Facility Analysis Items...');
    let facilityAnalysisGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
      await this.analysisDbService.addWithObservable(facilityAnalysisItem).toPromise();
    }


    this.loadingService.setLoadingMessage('Adding Predictors...');
    let predictorDataGUIDs:  Array<{oldId: string, newId: string}> = new Array();
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
      await this.predictorsDbService.addWithObservable(predictorEntry).toPromise();
    }


    this.loadingService.setLoadingMessage('Updating Account Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems.push({
        facilityId: newFacilityGUID,
        analysisItemId: undefined
      });
      await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]).toPromise();
    }

    this.loadingService.setLoadingMessage('Updating Account Reports...');
    let overviewReports: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let reportIndex = 0; reportIndex < overviewReports.length; reportIndex++) {
      overviewReports[reportIndex].reportOptions.facilities.push({
        facilityId: newFacilityGUID,
        selected: false
      });
      //TODO: update better plants reports items..
      await this.overviewReportOptionsDbService.updateWithObservable(overviewReports[reportIndex]).toPromise();
    }

    return newFacility;
  }

  async importAccountBackup(accountBackup: AccountBackup): Promise<IdbAccount> {
    this.loadingService.setLoadingMessage('Adding account..');
    //add account
    delete accountBackup.account.id;
    let account: IdbAccount = await this.accountDbService.addWithObservable(accountBackup.account).toPromise();
    //add facilities
    for (let i = 0; i < accountBackup.facilities.length; i++) {
      await this.importFacilityBackup(accountBackup.facilities[i], account.guid);
    }
    let newBackupAccount: IdbAccount = await this.accountDbService.getById(account.id).toPromise();
    return newBackupAccount;
  }

  async importFacilityBackup(facilityBackup: FacilityBackup, accountId: string): Promise<IdbFacility> {
    this.loadingService.setLoadingMessage('Adding facility..');
    //add facility
    delete facilityBackup.facility.id;
    facilityBackup.facility.accountId = accountId;
    let facility: IdbFacility = await this.facilityDbService.addWithObservable(facilityBackup.facility).toPromise();
    //add meters
    for (let meterIndex = 0; meterIndex < facilityBackup.meters.length; meterIndex++) {
      await this.importMeterBackup(facilityBackup.meters[meterIndex], accountId, facility.guid);
    }
    //add predictors
    this.loadingService.setLoadingMessage('Adding predictor data..');
    for (let predictorIndex = 0; predictorIndex < facilityBackup.predictors.length; predictorIndex++) {
      delete facilityBackup.predictors[predictorIndex].id;
      facilityBackup.predictors[predictorIndex].accountId = accountId;
      facilityBackup.predictors[predictorIndex].facilityId = facility.guid;
      await this.predictorsDbService.addWithObservable(facilityBackup.predictors[predictorIndex]).toPromise();
    }
    //update reports
    this.loadingService.setLoadingMessage('Updating reports...');
    let overviewReports: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let reportIndex = 0; reportIndex < overviewReports.length; reportIndex++) {
      overviewReports[reportIndex].reportOptions.facilities.push({
        facilityId: facility.guid,
        selected: false
      });
      await this.overviewReportOptionsDbService.updateWithObservable(overviewReports[reportIndex]).toPromise();
    }
    let newFacility: IdbFacility = await this.facilityDbService.getById(facility.id).toPromise();
    return newFacility;
  }

  async importMeterBackup(meterBackup: MeterBackup, accountId: string, facilityId: string) {
    this.loadingService.setLoadingMessage('Adding meter group..');
    if (meterBackup.meterGroup) {
      //check if group exists in facility
      let facilityGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByFacilityWithObservable(facilityId).toPromise();
      let existingGroup: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.name == meterBackup.meterGroup.name });
      //assign group id to meter
      if (existingGroup) {
        meterBackup.meter.groupId = existingGroup.guid;
      } else {
        delete meterBackup.meterGroup.id;
        meterBackup.meterGroup.facilityId = facilityId;
        meterBackup.meterGroup.accountId = accountId;
        let newMeterGroup: IdbUtilityMeterGroup = await this.utilityMeterGroupDbService.addWithObservable(meterBackup.meterGroup).toPromise();
        meterBackup.meter.groupId = newMeterGroup.guid;
      }
    }
    this.loadingService.setLoadingMessage('Adding meter..');
    //add meter
    delete meterBackup.meter.id;
    meterBackup.meter.accountId = accountId;
    meterBackup.meter.facilityId = facilityId;
    let newMeter: IdbUtilityMeter = await this.utilityMeterDbService.addWithObservable(meterBackup.meter).toPromise();

    this.loadingService.setLoadingMessage('Adding meter data..');
    //add meter data
    for (let meterDataIndex = 0; meterDataIndex < meterBackup.meterData.length; meterDataIndex++) {
      delete meterBackup.meterData[meterDataIndex].id;
      meterBackup.meterData[meterDataIndex].meterId = newMeter.guid;
      meterBackup.meterData[meterDataIndex].accountId = accountId;
      meterBackup.meterData[meterDataIndex].facilityId = facilityId;
      await this.utilityMeterDataDbService.addWithObservable(meterBackup.meterData[meterDataIndex]).toPromise()
    }
  }


  async deleteAccountData(account: IdbAccount) {
    //delete account
    await this.accountDbService.deleteAccountWithObservable(account.id).toPromise();
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    for (let i = 0; i < accountFacilites.length; i++) {
      await this.facilityDbService.deleteWithObservable(accountFacilites[i].id).toPromise();
    }
    //delete meters
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    for (let i = 0; i < accountMeters.length; i++) {
      await this.utilityMeterDbService.deleteIndexWithObservable(accountMeters[i].id).toPromise();
    }
    //delete meter data
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    for (let i = 0; i < accountMeterData.length; i++) {
      await this.utilityMeterDataDbService.deleteWithObservable(accountMeterData[i].id).toPromise();
    }
    //delete predictors
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    for (let i = 0; i < accountPredictorEntries.length; i++) {
      await this.predictorsDbService.deleteIndexWithObservable(accountPredictorEntries[i].id).toPromise();
    }
    //delete meter groups
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    for (let i = 0; i < accountMeterGroups.length; i++) {
      await this.utilityMeterGroupDbService.deleteWithObservable(accountMeterGroups[i].id).toPromise();
    }
  }

  async deleteFacilityData(facility: IdbFacility) {
    await this.facilityDbService.deleteWithObservable(facility.id).toPromise();
    //delete meters
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facility.guid });
    for (let i = 0; i < facilityMeters.length; i++) {
      await this.utilityMeterDbService.deleteIndexWithObservable(facilityMeters[i].id).toPromise();
    }
    //delete meter data
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == facility.guid });
    for (let i = 0; i < facilityMeterData.length; i++) {
      await this.utilityMeterDataDbService.deleteWithObservable(facilityMeterData[i].id).toPromise();
    }
    //delete predictors
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(predictor => { return predictor.facilityId == facility.guid });
    for (let i = 0; i < facilityPredictorEntries.length; i++) {
      await this.predictorsDbService.deleteIndexWithObservable(facilityPredictorEntries[i].id).toPromise();
    }
    //delete meter groups
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == facility.guid });
    for (let i = 0; i < facilityMeterGroups.length; i++) {
      await this.utilityMeterGroupDbService.deleteWithObservable(facilityMeterGroups[i].id).toPromise();
    }
  }
}

export interface BackupFile {
  account: IdbAccount,
  facilities: Array<IdbFacility>,
  facility: IdbFacility,
  meters: Array<IdbUtilityMeter>,
  meterData: Array<IdbUtilityMeterData>,
  groups: Array<IdbUtilityMeterGroup>,
  reports: Array<IdbOverviewReportOptions>,
  accountAnalysisItems: Array<IdbAccountAnalysisItem>,
  facilityAnalysisItems: Array<IdbAnalysisItem>,
  predictorData: Array<IdbPredictorEntry>,
  // accountBackup?: AccountBackup,
  // facilityBackup?: FacilityBackup,
  origin: "VERIFI",
  backupFileType: "Account" | "Facility"
}


export interface AccountBackup {
  account: IdbAccount,
  accountAnalysisItems: Array<IdbAccountAnalysisItem>,
  accountReports: Array<IdbOverviewReportOptions>,
  facilities: Array<FacilityBackup>,
}

export interface FacilityBackup {
  facility: IdbFacility,
  meters: Array<MeterBackup>,
  predictors: Array<IdbPredictorEntry>,

}

export interface MeterBackup {
  meter: IdbUtilityMeter,
  meterData: Array<IdbUtilityMeterData>,
  meterGroup: IdbUtilityMeterGroup
}
