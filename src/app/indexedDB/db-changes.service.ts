import { Injectable } from '@angular/core';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from '../models/idb';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { AccountdbService } from './account-db.service';
import { AnalysisDbService } from './analysis-db.service';
import { FacilitydbService } from './facility-db.service';
import { OverviewReportOptionsDbService } from './overview-report-options-db.service';
import { PredictordbService } from './predictors-db.service';
import { UtilityMeterdbService } from './utilityMeter-db.service';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';

@Injectable({
  providedIn: 'root'
})
export class DbChangesService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService, private analysisDbService: AnalysisDbService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private predictorsDbService: PredictordbService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  async updateAccount(account: IdbAccount) {
    let accounts: Array<IdbAccount> = await this.accountDbService.updateWithObservable(account).toPromise();
    this.accountDbService.allAccounts.next(accounts);
    this.accountDbService.selectedAccount.next(account);
  }


  async selectAccount(account: IdbAccount) {
    //set account facilities
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.facilityDbService.accountFacilities.next(accountFacilites);
    //set account analysis
    await this.setAccountAnalysisItems(account);
    //set overview reports
    await this.setAccountOverviewReportOptions(account);
    //set analysis
    await this.setAnalysisItems(account);
    //set predictors
    await this.setPredictors(account);
    //set meters
    await this.setMeters(account);
    //set meter data
    await this.setMeterData(account);
    //set meter groups
    await this.setMeterGroups(account);

    this.accountDbService.selectedAccount.next(account);
  }

  selectFacility(facility: IdbFacility) {
    console.log('DB Changes Select Facility');
    //set analaysis
    this.setFacilityAnalysisItems(facility);
    //set predictors
    this.setFacilityPredictors(facility);
    //set meters
    this.setFacilityMeters(facility);
    //set meter data
    this.setFacilityMeterData(facility);
    //set meter groups
    this.setFacilityMeterGroups(facility);
    this.facilityDbService.selectedFacility.next(facility);
  }

  async setAccountAnalysisItems(account: IdbAccount) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
  }

  async setAnalysisItems(account: IdbAccount, facility?: IdbFacility) {
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.analysisDbService.accountAnalysisItems.next(analysisItems);
    if (facility) {
      this.setFacilityAnalysisItems(facility);
    }
  }

  setFacilityAnalysisItems(facility: IdbFacility) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == facility.guid });
    this.analysisDbService.facilityAnalysisItems.next(facilityAnalysisItems);
  }

  async updateFacilities(selectedFacility: IdbFacility) {
    let facilities: Array<IdbFacility> = await this.facilityDbService.updateWithObservable(selectedFacility).toPromise();
    let accountFacilites: Array<IdbFacility> = facilities.filter(facility => { return facility.accountId == selectedFacility.accountId });
    this.facilityDbService.accountFacilities.next(accountFacilites);
    this.facilityDbService.selectedFacility.next(selectedFacility);
  }


  async setAccountOverviewReportOptions(account: IdbAccount) {
    let overviewReportOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    let templates: Array<IdbOverviewReportOptions> = overviewReportOptions.filter(option => { return option.type == 'template' });
    let nonTemplates: Array<IdbOverviewReportOptions> = overviewReportOptions.filter(option => { return option.type != 'template' });
    this.overviewReportOptionsDbService.accountOverviewReportOptions.next(nonTemplates);
    this.overviewReportOptionsDbService.overviewReportOptionsTemplates.next(templates);
  }


  async setPredictors(account: IdbAccount, facility?: IdbFacility) {
    let predictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.predictorsDbService.accountPredictorEntries.next(predictors);
    if (facility) {
      this.setFacilityPredictors(facility);
    }
  }

  setFacilityPredictors(facility: IdbFacility) {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(item => { return item.facilityId == facility.guid });
    this.predictorsDbService.facilityPredictorEntries.next(facilityPredictorEntries);
    if (facilityPredictorEntries.length != 0) {
      this.predictorsDbService.facilityPredictors.next(facilityPredictorEntries[0].predictors);
    } else {
      this.predictorsDbService.facilityPredictors.next([]);
    }
  }

  async setMeters(account: IdbAccount, facility?: IdbFacility) {
    let meters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterDbService.accountMeters.next(meters);
    if (facility) {
      this.setFacilityMeters(facility);
    }
  }

  setFacilityMeters(facility: IdbFacility) {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(item => { return item.facilityId == facility.guid });
    this.utilityMeterDbService.facilityMeters.next(facilityMeters);
  }

  async setMeterData(account: IdbAccount, facility?: IdbFacility) {
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterDataDbService.accountMeterData.next(accountMeterData);
    if (facility) {
      this.setFacilityMeterData(facility);
    }
  }

  setFacilityMeterData(facility: IdbFacility) {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(item => { return item.facilityId == facility.guid });
    this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);
  }

  async setMeterGroups(account: IdbAccount, facility?: IdbFacility) {
    let meterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterGroupDbService.accountMeterGroups.next(meterGroups);
    if (facility) {
      this.setFacilityMeterGroups(facility);
    }
  }

  setFacilityMeterGroups(facility: IdbFacility) {
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(item => { return item.facilityId == facility.guid });
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityMeterGroups);
  }
}
