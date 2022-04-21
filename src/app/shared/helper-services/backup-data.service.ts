import { Injectable } from '@angular/core';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { PredictordbService } from '../../indexedDB/predictors-db.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../../indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from '../../models/idb';
import { LoadingService } from '../../core-components/loading/loading.service';
import { OverviewReportOptionsDbService } from '../../indexedDB/overview-report-options-db.service';

@Injectable({
  providedIn: 'root'
})
export class BackupDataService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService, private predictorsDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private uilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService, private loadingService: LoadingService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService) { }


  backupAccount() {
    let accountBackup: AccountBackup = this.getAccountBackup();
    let backupFile: BackupFile = {
      accountBackup: accountBackup,
      backupFileType: "Account",
      origin: "VERIFI"
    };

    let backupName: string = accountBackup.account.name.split(' ').join('_') + '_Backup_';
    this.downloadBackup(backupFile, backupName);
  }

  backupFacility(facility: IdbFacility) {
    let facilityBackup: FacilityBackup = this.getFacilityBackup(facility);
    let backupFile: BackupFile = {
      facilityBackup: facilityBackup,
      backupFileType: "Facility",
      origin: "VERIFI"
    }
    let backupName: string = facilityBackup.facility.name.split(' ').join('_') + '_Backup_';
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

  getAccountBackup(): AccountBackup {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    account.lastBackup = new Date();
    this.accountDbService.update(account);
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let facilitiesBackups: Array<FacilityBackup> = new Array();
    facilities.forEach(facility => {
      let facilityBackup: FacilityBackup = this.getFacilityBackup(facility);
      facilitiesBackups.push(facilityBackup);
    });
    return {
      account: account,
      facilities: facilitiesBackups
    }
  }

  getFacilityBackup(facility: IdbFacility): FacilityBackup {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let predictors: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();

    let meterBackups: Array<MeterBackup> = new Array();
    meters.forEach(meter => {
      if (meter.facilityId == facility.guid) {
        let meterBackup: MeterBackup = this.getMeterBackup(meter);
        meterBackups.push(meterBackup);
      }
    });
    let facilityPredictors: Array<IdbPredictorEntry> = predictors.filter(predictor => { return predictor.facilityId == facility.guid });
    return {
      facility: facility,
      meters: meterBackups,
      predictors: facilityPredictors
    }
  }


  getMeterBackup(meter: IdbUtilityMeter): MeterBackup {
    let accountMeterData: Array<IdbUtilityMeterData> = this.uilityMeterDataDbService.accountMeterData.getValue();
    let meterData: Array<IdbUtilityMeterData> = accountMeterData.filter(dataItem => { return dataItem.meterId == meter.guid });
    let meterGroup: IdbUtilityMeterGroup;
    if (meter.groupId) {
      let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
      meterGroup = accountMeterGroups.find(meterGroupItem => { return meterGroupItem.guid == meter.groupId });
    }
    return {
      meter: meter,
      meterData: meterData,
      meterGroup: meterGroup
    }
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
    for(let reportIndex = 0; reportIndex < overviewReports.length; reportIndex++){
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
      await this.uilityMeterDataDbService.addWithObservable(meterBackup.meterData[meterDataIndex]).toPromise()
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
    let accountMeterData: Array<IdbUtilityMeterData> = this.uilityMeterDataDbService.accountMeterData.getValue();
    for (let i = 0; i < accountMeterData.length; i++) {
      await this.uilityMeterDataDbService.deleteWithObservable(accountMeterData[i].id).toPromise();
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
    let accountMeterData: Array<IdbUtilityMeterData> = this.uilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == facility.guid });
    for (let i = 0; i < facilityMeterData.length; i++) {
      await this.uilityMeterDataDbService.deleteWithObservable(facilityMeterData[i].id).toPromise();
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
  accountBackup?: AccountBackup,
  facilityBackup?: FacilityBackup,
  origin: "VERIFI",
  backupFileType: "Account" | "Facility"
}


export interface AccountBackup {
  account: IdbAccount,
  facilities: Array<FacilityBackup>,
}

export interface FacilityBackup {
  facility: IdbFacility,
  meters: Array<MeterBackup>,
  predictors: Array<IdbPredictorEntry>
}

export interface MeterBackup {
  meter: IdbUtilityMeter,
  meterData: Array<IdbUtilityMeterData>,
  meterGroup: IdbUtilityMeterGroup
}
