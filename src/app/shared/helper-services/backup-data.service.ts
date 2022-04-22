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
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.facilityId == facility.guid });

    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = meterData.filter(meter => { return meter.facilityId == facility.guid });

    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityGroups: Array<IdbUtilityMeterGroup> = groups.filter(meter => { return meter.facilityId == facility.guid });

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

  getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getNewId(oldId: string, GUIDs: Array<{ oldId: string, newId: string }>): string {
    let GUID: string = GUIDs.find(id => { return id.oldId == oldId })?.newId;
    return GUID;
  }

  async importAccountBackupFile(backupFile: BackupFile): Promise<IdbAccount> {
    this.loadingService.setLoadingMessage('Adding Account...');
    let accountGUIDs: { oldId: string, newId: string } = {
      oldId: backupFile.account.guid,
      newId: this.getGUID()
    }
    delete backupFile.account.id;
    backupFile.account.guid = accountGUIDs.newId;
    let newAccount: IdbAccount = await this.accountDbService.addWithObservable(backupFile.account).toPromise();

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
      await this.facilityDbService.addWithObservable(facility).toPromise();
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
      await this.utilityMeterGroupDbService.addWithObservable(group).toPromise();
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
      await this.utilityMeterDbService.addWithObservable(meter).toPromise();
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
      await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
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
      await this.predictorsDbService.addWithObservable(predictorEntry).toPromise();
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
        // group.predictorVariables.forEach(variable => {
        //   variable.id = this.getNewId(variable.id, predictorDataGUIDs);
        // });
      });
      await this.analysisDbService.addWithObservable(facilityAnalysisItem).toPromise();
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
      reportOptions.reportOptions.analysisItemId = this.getNewId(reportOptions.reportOptions.analysisItemId, accountAnalysisGUIDs);
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
      await this.utilityMeterGroupDbService.addWithObservable(group).toPromise();
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
      await this.utilityMeterDbService.addWithObservable(meter).toPromise();
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
      await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
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
      await this.analysisDbService.addWithObservable(facilityAnalysisItem).toPromise();
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

    //delete reports
    let reports: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let i = 0; i < reports.length; i++) {
      await this.overviewReportOptionsDbService.deleteWithObservable(reports[i].id).toPromise();
    }
    //delete account analysis
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      await this.accountAnalysisDbService.deleteWithObservable(accountAnalysisItems[i].id).toPromise();
    }
    //delete facility analysis
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < facilityAnalysisItems.length; i++) {
      await this.analysisDbService.deleteWithObservable(facilityAnalysisItems[i].id).toPromise();
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

    //delete facility analysis
    let accountFacilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountFacilityAnalysisItems.filter(item => { return item.facilityId == facility.guid });
    for (let i = 0; i < facilityAnalysisItems.length; i++) {
      await this.analysisDbService.deleteWithObservable(facilityAnalysisItems[i].id).toPromise();
    }

    //update reports
    let reports: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let i = 0; i < reports.length; i++) {
      reports[i].reportOptions.facilities = reports[i].reportOptions.facilities.filter(option => {return option.facilityId != facility.guid});
      await this.overviewReportOptionsDbService.updateWithObservable(reports[i]).toPromise();
    }
    //update account analysis
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems = accountAnalysisItems[i].facilityAnalysisItems.filter(option => {return option.facilityId != facility.guid});
      await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]).toPromise();
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
  origin: "VERIFI",
  backupFileType: "Account" | "Facility"
}
