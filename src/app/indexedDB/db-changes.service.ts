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
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
    //set overview reports
    let overviewReportOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.overviewReportOptionsDbService.accountOverviewReportOptions.next(overviewReportOptions);
    //set analysis
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.analysisDbService.accountAnalysisItems.next(analysisItems);
    //set predictors
    let predictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.predictorsDbService.accountPredictorEntries.next(predictors);
    //set meters
    let meters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterDbService.accountMeters.next(meters);
    //set meter data
    let meterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterDataDbService.accountMeterData.next(meterData)
    //set meter groups
    let meterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterGroupDbService.accountMeterGroups.next(meterGroups);
    this.accountDbService.selectedAccount.next(account);
  }

  selectFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    //set analaysis
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == facility.guid });
    this.analysisDbService.facilityAnalysisItems.next(facilityAnalysisItems);
    //set predictors
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorsDbService.accountPredictorEntries.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(item => { return item.facilityId == facility.guid });
    this.predictorsDbService.facilityPredictorEntries.next(facilityPredictorEntries);
    if (facilityPredictorEntries.length != 0) {
      this.predictorsDbService.facilityPredictors.next(facilityPredictorEntries[0].predictors);
    } else {
      this.predictorsDbService.facilityPredictors.next([]);
    }
    //set meters
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(item => { return item.facilityId == facility.guid });
    // this.utilityMeterDbService.facilityMeters.next(facilityMeters);

    //set meter data
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(item => { return item.facilityId == facility.guid });
    this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);

    //set meter groups
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(item => { return item.facilityId == facility.guid });
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityMeterGroups);
  }


  updateAccountAndFacilities() {

  }

  updateFacility() {

  }

  updateFacilityAndFacilityData() {

  }
}
