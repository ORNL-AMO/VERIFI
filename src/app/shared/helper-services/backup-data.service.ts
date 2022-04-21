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

  async importAccountBackupFile(backupFile: BackupFile): Promise<IdbAccount> {
    this.loadingService.setLoadingMessage('Adding Account...');
    delete backupFile.account.id;
    backupFile.account.guid = this.getGUID();
    let newAccount: IdbAccount = await this.accountDbService.addWithObservable(backupFile.account).toPromise();
    this.loadingService.setLoadingMessage('Adding Facilities...');
    for (let i = 0; i < backupFile.facilities.length; i++) {
      let facility: IdbFacility = backupFile.facilities[i];
      delete facility.id;
      await this.facilityDbService.addWithObservable(facility).toPromise();
    }
    this.loadingService.setLoadingMessage('Adding Meters...');
    for (let i = 0; i < backupFile.meters.length; i++) {
      let meter: IdbUtilityMeter = backupFile.meters[i];
      delete meter.id;
      await this.utilityMeterDbService.addWithObservable(meter).toPromise();
    }
    this.loadingService.setLoadingMessage('Adding Meter Data...');
    for (let i = 0; i < backupFile.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = backupFile.meterData[i];
      delete meterData.id;
      await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Meter Groups...');
    for (let i = 0; i < backupFile.groups.length; i++) {
      let group: IdbUtilityMeterGroup = backupFile.groups[i];
      delete group.id;
      await this.utilityMeterGroupDbService.addWithObservable(group).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Predictors...');
    for (let i = 0; i < backupFile.predictorData.length; i++) {
      let predictorEntry: IdbPredictorEntry = backupFile.predictorData[i];
      delete predictorEntry.id;
      await this.predictorsDbService.addWithObservable(predictorEntry).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Facility Analysis Items...');
    for (let i = 0; i < backupFile.facilityAnalysisItems.length; i++) {
      let facilityAnalysisItem: IdbAnalysisItem = backupFile.facilityAnalysisItems[i];
      delete facilityAnalysisItem.id;
      await this.analysisDbService.addWithObservable(facilityAnalysisItem).toPromise();
    }


    this.loadingService.setLoadingMessage('Adding Account Analysis Items...');
    for (let i = 0; i < backupFile.accountAnalysisItems.length; i++) {
      let accountAnalysisItem: IdbAccountAnalysisItem = backupFile.accountAnalysisItems[i];
      delete accountAnalysisItem.id;
      await this.accountAnalysisDbService.addWithObservable(accountAnalysisItem).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Account Reports...');
    for (let i = 0; i < backupFile.reports.length; i++) {
      let reportOptions: IdbOverviewReportOptions = backupFile.reports[i];
      delete reportOptions.id;
      await this.overviewReportOptionsDbService.addWithObservable(reportOptions).toPromise();
    }
    return newAccount;
  }

  async importFacilityBackupFile(backupFile: BackupFile, accountGUID: string): Promise<IdbFacility> {
    this.loadingService.setLoadingMessage('Adding Facility...');
    delete backupFile.facility.id;
    backupFile.facility.accountId = accountGUID;
    let newFacility: IdbFacility = await this.facilityDbService.addWithObservable(backupFile.facility).toPromise();

    this.loadingService.setLoadingMessage('Adding Meters...');
    for (let i = 0; i < backupFile.meters.length; i++) {
      let meter: IdbUtilityMeter = backupFile.meters[i];
      delete meter.id;
      meter.accountId = accountGUID;
      await this.utilityMeterDbService.addWithObservable(meter).toPromise();
    }
    this.loadingService.setLoadingMessage('Adding Meter Data...');
    for (let i = 0; i < backupFile.meterData.length; i++) {
      let meterData: IdbUtilityMeterData = backupFile.meterData[i];
      delete meterData.id;
      meterData.accountId = accountGUID;
      await this.utilityMeterDataDbService.addWithObservable(meterData).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Meter Groups...');
    for (let i = 0; i < backupFile.groups.length; i++) {
      let group: IdbUtilityMeterGroup = backupFile.groups[i];
      delete group.id;
      group.accountId = accountGUID;
      await this.utilityMeterGroupDbService.addWithObservable(group).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Facility Analysis Items...');
    for (let i = 0; i < backupFile.facilityAnalysisItems.length; i++) {
      let facilityAnalysisItem: IdbAnalysisItem = backupFile.facilityAnalysisItems[i];
      delete facilityAnalysisItem.id;
      facilityAnalysisItem.accountId = accountGUID;
      await this.analysisDbService.addWithObservable(facilityAnalysisItem).toPromise();
    }

    this.loadingService.setLoadingMessage('Adding Predictors...');
    for (let i = 0; i < backupFile.predictorData.length; i++) {
      let predictorEntry: IdbPredictorEntry = backupFile.predictorData[i];
      delete predictorEntry.id;
      predictorEntry.accountId = accountGUID;
      await this.predictorsDbService.addWithObservable(predictorEntry).toPromise();
    }


    this.loadingService.setLoadingMessage('Updating Account Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      accountAnalysisItems[i].facilityAnalysisItems.push({
        facilityId: backupFile.facility.guid,
        analysisItemId: undefined
      });
      await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]).toPromise();
    }

    this.loadingService.setLoadingMessage('Updating Account Reports...');
    let overviewReports: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let reportIndex = 0; reportIndex < overviewReports.length; reportIndex++) {
      overviewReports[reportIndex].reportOptions.facilities.push({
        facilityId: backupFile.facility.guid,
        selected: false
      });
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
