import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccountAnalysisDbService } from './indexedDB/account-analysis-db.service';
import { AccountdbService } from './indexedDB/account-db.service';
import { AnalysisDbService } from './indexedDB/analysis-db.service';
import { FacilitydbService } from './indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from './indexedDB/overview-report-options-db.service';
import { PredictordbService } from './indexedDB/predictors-db.service';
import { UtilityMeterdbService } from './indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from './indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from './models/idb';
import { EGridService } from './shared/helper-services/e-grid.service';
import { SharedDataService } from './shared/helper-services/shared-data.service';

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
    private sharedDataService: SharedDataService) {
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
    this.eGridService.parseEGridData();
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
    if (account) {
      this.loadingMessage = "Loading Facilities..";
      //set account facilities
      let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.facilityDbService.accountFacilities.next(accountFacilites);
      //set account analysis
      this.loadingMessage = "Loading Analysis Items..";
      let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
      //set analysis
      let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.analysisDbService.accountAnalysisItems.next(analysisItems);
      //set overview reports
      this.loadingMessage = "Loading Reports..";
      let overviewReportOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.overviewReportOptionsDbService.accountOverviewReportOptions.next(overviewReportOptions);
      //set predictors
      this.loadingMessage = "Loading Predictors..";
      let predictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.predictorsDbService.accountPredictorEntries.next(predictors);
      //set meters
      this.loadingMessage = "Loading Meters..";
      let meters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.utilityMeterDbService.accountMeters.next(meters);
      //set meter data
      this.loadingMessage = "Loading Meter Data..";
      let meterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.utilityMeterDataDbService.accountMeterData.next(meterData)
      //set meter groups
      this.loadingMessage = "Loading Groups..";
      let meterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange('accountId', account.guid).toPromise();
      this.utilityMeterGroupDbService.accountMeterGroups.next(meterGroups);
      this.accountDbService.selectedAccount.next(account);
      this.dataInitialized = true;
    }else{
      this.dataInitialized = true;
      this.router.navigateByUrl('setup-wizard');
    }
    // await this.accountDbService.initializeAccountFromLocalStorage();
    // this.loadingMessage = "Loading Facilities..";
    // await this.facilityDbService.initializeFacilityFromLocalStorage();
    // this.loadingMessage = "Loading Meters..";
    // await this.utilityMeterDbService.initializeMeterData();
    // this.loadingMessage = "Loading Meter Data..";
    // await this.utilityMeterDataDbService.initializeMeterData();
    // this.loadingMessage = "Loading Predictors..";
    // await this.predictorsDbService.initializePredictorData();
    // this.loadingMessage = "Loading Meter Groups..";
    // await this.utilityMeterGroupDbService.initializeMeterGroups();
    // this.loadingMessage = 'Loading Reports...'
    // await this.overviewReportOptionsDbService.initializeReportsFromLocalStorage();
    // this.loadingMessage = 'Loading Facility Analysis Items...';
    // await this.analysisDbService.initializeAnalysisItems();
    // this.loadingMessage = 'Loading Account Analysis Items...';
    // await this.accountAnalysisDbService.initializeAnalysisItems();
    // this.dataInitialized = true;
    // let allAccounts: Array<IdbAccount> = this.accountDbService.allAccounts.getValue();
    // if (allAccounts.length == 0) {
    //   this.router.navigateByUrl('setup-wizard');
    // }
  }
}
