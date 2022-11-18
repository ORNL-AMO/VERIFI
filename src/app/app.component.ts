import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccountAnalysisDbService } from './indexedDB/account-analysis-db.service';
import { AccountdbService } from './indexedDB/account-db.service';
import { AnalysisDbService } from './indexedDB/analysis-db.service';
import { CustomEmissionsDbService } from './indexedDB/custom-emissions-db.service';
import { FacilitydbService } from './indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from './indexedDB/overview-report-options-db.service';
import { PredictordbService } from './indexedDB/predictors-db.service';
import { UpdateDbEntryService } from './indexedDB/update-db-entry.service';
import { UtilityMeterdbService } from './indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from './indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbCustomEmissionsItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from './models/idb';
import { EGridService } from './shared/helper-services/e-grid.service';

// declare ga as a function to access the JS code in TS
declare let gtag: Function;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  @ViewChild('header', { static: false }) header: ElementRef;

  dataInitialized: boolean = false;
  loadingMessage: string = "Loading Accounts...";
  constructor(
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorsDbService: PredictordbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    public router: Router,
    private eGridService: EGridService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private updateDbEntryService: UpdateDbEntryService,
    private customEmissionsDbService: CustomEmissionsDbService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        gtag('config', 'G-YG1QD02XSE',
          {
            'page_path': event.urlAfterRedirects
          }
        );
      }
    })
  }

  ngOnInit() {
    this.initializeData();
  }

  async initializeData() {
    let accounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
    this.accountDbService.allAccounts.next(accounts);
    let localStorageAccountId: number = this.accountDbService.getInitialAccount();
    let account: IdbAccount;
    if (localStorageAccountId) {
      account = accounts.find(account => { return account.id == localStorageAccountId });
    } else if (accounts.length != 0) {
      account = accounts[0];
    }
 
    await this.eGridService.parseZipCodeLongLat();
    if (account) {
      await this.initializeFacilities(account);
      await this.initializeReports(account);
      await this.initializePredictors(account);
      await this.initializeMeters(account);
      await this.initializeMeterData(account);
      await this.initilizeMeterGroups(account);
      await this.initializeAccountAnalysisItems(account);
      await this.initializeFacilityAnalysisItems(account);
      await this.initializeCustomEmissions(account);
      let updatedAccount: { account: IdbAccount, isChanged: boolean } = this.updateDbEntryService.updateAccount(account);
      if(updatedAccount.isChanged){
        await this.accountDbService.updateWithObservable(updatedAccount.account).toPromise();
        this.accountDbService.selectedAccount.next(updatedAccount.account);
      }else{
        this.accountDbService.selectedAccount.next(account);
      }
      this.dataInitialized = true;
    } else {
      await this.eGridService.parseEGridData();

      this.dataInitialized = true;
      this.router.navigateByUrl('setup-wizard');
    }
  }

  async initializeFacilities(account: IdbAccount) {
    this.loadingMessage = "Loading Facilities..";
    //set account facilities
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.facilityDbService.accountFacilities.next(accountFacilites);
    let localStorageFacilityId: number = this.facilityDbService.getInitialFacility();
    if (localStorageFacilityId) {
      let facility: IdbFacility = accountFacilites.find(facility => { return facility.id == localStorageFacilityId });
      this.facilityDbService.selectedFacility.next(facility);
    }
  }

  async initializeAccountAnalysisItems(account: IdbAccount) {
    //set account analysis
    this.loadingMessage = "Loading Analysis Items..";
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
    let localStorageAccountAnalysisId: number = this.accountAnalysisDbService.getInitialAnalysisItem();
    if (localStorageAccountAnalysisId) {
      let analysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.id == localStorageAccountAnalysisId });
      this.accountAnalysisDbService.selectedAnalysisItem.next(analysisItem);
    }
  }

  async initializeFacilityAnalysisItems(account: IdbAccount) {
    //set analysis
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    for (let i = 0; i < analysisItems.length; i++) {
      let updateAnalysis: { analysisItem: IdbAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAnalysis(analysisItems[i]);
      if (updateAnalysis.isChanged) {
        analysisItems[i] = updateAnalysis.analysisItem;
        await this.analysisDbService.updateWithObservable(analysisItems[i]).toPromise();
      };
    }
    this.analysisDbService.accountAnalysisItems.next(analysisItems);
    let localStorageAnalysisId: number = this.analysisDbService.getInitialAnalysisItem();
    if (localStorageAnalysisId) {
      let analysisItem: IdbAnalysisItem = analysisItems.find(item => { return item.id == localStorageAnalysisId });
      this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    }
  }

  async initializeReports(account: IdbAccount) {
    //set overview reports
    this.loadingMessage = "Loading Reports..";
    let overviewReportOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    let templates: Array<IdbOverviewReportOptions> = overviewReportOptions.filter(option => { return option.type == 'template' });
    let nonTemplates: Array<IdbOverviewReportOptions> = overviewReportOptions.filter(option => { return option.type != 'template' });
    this.overviewReportOptionsDbService.accountOverviewReportOptions.next(nonTemplates);
    this.overviewReportOptionsDbService.overviewReportOptionsTemplates.next(templates);
    let overviewReportId: number = this.overviewReportOptionsDbService.getInitialReport();
    if (overviewReportId) {
      let reportOptions: IdbOverviewReportOptions = overviewReportOptions.find(item => { return item.id == overviewReportId });
      this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(reportOptions);
    }
  }

  async initializePredictors(account: IdbAccount) {
    //set predictors
    this.loadingMessage = "Loading Predictors..";
    let predictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.predictorsDbService.accountPredictorEntries.next(predictors);
  }

  async initializeMeters(account: IdbAccount) {
    //set meters
    this.loadingMessage = "Loading Meters..";
    let meters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterDbService.accountMeters.next(meters);
  }

  async initializeMeterData(account: IdbAccount) {
    //set meter data
    this.loadingMessage = "Loading Meter Data..";
    let meterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterDataDbService.accountMeterData.next(meterData)
  }

  async initilizeMeterGroups(account: IdbAccount) {
    //set meter groups
    this.loadingMessage = "Loading Groups..";
    let meterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    this.utilityMeterGroupDbService.accountMeterGroups.next(meterGroups);
  }


  async initializeCustomEmissions(account: IdbAccount) {
    this.loadingMessage = 'Loading Emissions Rates...';
    let customEmissionsItems: Array<IdbCustomEmissionsItem> = await this.customEmissionsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
    if (customEmissionsItems.length == 0) {
      let uSAverageItem: IdbCustomEmissionsItem = this.customEmissionsDbService.getUSAverage(account);
      uSAverageItem = await this.customEmissionsDbService.addWithObservable(uSAverageItem).toPromise();
      customEmissionsItems.push(uSAverageItem);
    }
    await this.eGridService.parseEGridData();
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
  }
}
