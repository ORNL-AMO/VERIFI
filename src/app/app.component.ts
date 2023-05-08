import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccountAnalysisDbService } from './indexedDB/account-analysis-db.service';
import { AccountdbService } from './indexedDB/account-db.service';
import { AccountReportDbService } from './indexedDB/account-report-db.service';
import { AnalysisDbService } from './indexedDB/analysis-db.service';
import { CustomEmissionsDbService } from './indexedDB/custom-emissions-db.service';
import { FacilitydbService } from './indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from './indexedDB/overview-report-options-db.service';
import { PredictordbService } from './indexedDB/predictors-db.service';
import { UpdateDbEntryService } from './indexedDB/update-db-entry.service';
import { UtilityMeterdbService } from './indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from './indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbCustomEmissionsItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from './models/idb';
import { EGridService } from './shared/helper-services/e-grid.service';
import { firstValueFrom } from 'rxjs';

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
  startupError: string;
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
    private customEmissionsDbService: CustomEmissionsDbService,
    private accountReportDbService: AccountReportDbService) {
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
    try {
      let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
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
        // await this.initializeReports(account);
        await this.initializeAccountReports(account);
        await this.initializePredictors(account);
        await this.initializeMeters(account);
        await this.initializeMeterData(account);
        await this.initilizeMeterGroups(account);
        await this.initializeAccountAnalysisItems(account);
        await this.initializeFacilityAnalysisItems(account);
        await this.initializeCustomEmissions(account);
        let updatedAccount: { account: IdbAccount, isChanged: boolean } = this.updateDbEntryService.updateAccount(account);
        if (updatedAccount.isChanged) {
          await firstValueFrom(this.accountDbService.updateWithObservable(updatedAccount.account));
          this.accountDbService.selectedAccount.next(updatedAccount.account);
        } else {
          this.accountDbService.selectedAccount.next(account);
        }
        this.dataInitialized = true;
      } else {
        await this.eGridService.parseEGridData();

        this.dataInitialized = true;
        this.router.navigateByUrl('setup-wizard');
      }
    } catch (err) {
      console.log(err);
      this.startupError = err;
    }
  }

  async initializeFacilities(account: IdbAccount) {
    this.loadingMessage = "Loading Facilities..";
    //set account facilities
    let allFacilities: Array<IdbFacility> = await firstValueFrom(this.facilityDbService.getAll());
    let accountFacilites: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == account.guid });
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
    let allAnalysisItesm: Array<IdbAccountAnalysisItem> = await firstValueFrom(this.accountAnalysisDbService.getAll())
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = allAnalysisItesm.filter(item => { return item.accountId == account.guid });
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
    let localStorageAccountAnalysisId: number = this.accountAnalysisDbService.getInitialAnalysisItem();
    if (localStorageAccountAnalysisId) {
      let analysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.id == localStorageAccountAnalysisId });
      this.accountAnalysisDbService.selectedAnalysisItem.next(analysisItem);
    }
  }

  async initializeFacilityAnalysisItems(account: IdbAccount) {
    //set analysis
    let allAnalysisItesm: Array<IdbAnalysisItem> = await firstValueFrom(this.analysisDbService.getAll())
    let analysisItems: Array<IdbAnalysisItem> = allAnalysisItesm.filter(item => { return item.accountId == account.guid });
    for (let i = 0; i < analysisItems.length; i++) {
      let updateAnalysis: { analysisItem: IdbAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAnalysis(analysisItems[i]);
      if (updateAnalysis.isChanged) {
        analysisItems[i] = updateAnalysis.analysisItem;
        await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItems[i]));
      };
    }
    this.analysisDbService.accountAnalysisItems.next(analysisItems);
    let localStorageAnalysisId: number = this.analysisDbService.getInitialAnalysisItem();
    if (localStorageAnalysisId) {
      let analysisItem: IdbAnalysisItem = analysisItems.find(item => { return item.id == localStorageAnalysisId });
      this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    }
  }

  async initializeAccountReports(account: IdbAccount) {
    this.loadingMessage = "Loading Reports 2.0...."
    let allOverviewReportOptions: Array<IdbOverviewReportOptions> = await firstValueFrom(this.overviewReportOptionsDbService.getAll());
    let overviewReportOptions: Array<IdbOverviewReportOptions> = allOverviewReportOptions.filter(option => { return option.accountId == account.guid });
    for (let i = 0; i < overviewReportOptions.length; i++) {
      let overviewReport: IdbOverviewReportOptions = overviewReportOptions[i];
      if (overviewReport.type == 'report' && overviewReport.reportOptionsType == 'betterPlants') {
        let newReport: IdbAccountReport = this.accountReportDbService.getNewAccountReport(account);
        newReport.name = overviewReport.name;
        newReport.baselineYear = overviewReport.baselineYear;
        newReport.reportYear = overviewReport.targetYear;
        newReport.reportType = 'betterPlants';
        newReport.betterPlantsReportSetup.analysisItemId = overviewReport.reportOptions.analysisItemId;
        newReport.betterPlantsReportSetup.baselineAdjustmentNotes = overviewReport.reportOptions.baselineAdjustmentNotes;
        newReport.betterPlantsReportSetup.includeFacilityNames = overviewReport.reportOptions.includeFacilityNames;
        newReport.betterPlantsReportSetup.modificationNotes = overviewReport.reportOptions.modificationNotes;
        await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
      }
      await firstValueFrom(this.overviewReportOptionsDbService.deleteWithObservable(overviewReport.id));
    }
    let allReports: Array<IdbAccountReport> = await firstValueFrom(this.accountReportDbService.getAll())
    let accountReports: Array<IdbAccountReport> = allReports.filter(report => { return report.accountId == account.guid });
    this.accountReportDbService.accountReports.next(accountReports);
    let accountReportId: number = this.accountReportDbService.getInitialReport();
    if (accountReportId) {
      let report: IdbAccountReport = accountReports.find(item => { return item.id == accountReportId });
      this.accountReportDbService.selectedReport.next(report);
    }
  }



  async initializePredictors(account: IdbAccount) {
    //set predictors
    this.loadingMessage = "Loading Predictors..";
    let allPredictors: Array<IdbPredictorEntry> = await firstValueFrom(this.predictorsDbService.getAll());
    let predictors: Array<IdbPredictorEntry> = allPredictors.filter(predictor => { return predictor.accountId == account.guid });
    this.predictorsDbService.accountPredictorEntries.next(predictors);
  }

  async initializeMeters(account: IdbAccount) {
    //set meters
    this.loadingMessage = "Loading Meters..";
    let allMeters: Array<IdbUtilityMeter> = await firstValueFrom(this.utilityMeterDbService.getAll())
    let accountMeters: Array<IdbUtilityMeter> = allMeters.filter(meter => { return meter.accountId == account.guid });
    this.utilityMeterDbService.accountMeters.next(accountMeters);
  }

  async initializeMeterData(account: IdbAccount) {
    //set meter data
    this.loadingMessage = "Loading Meter Data..";
    let allMeterData: Array<IdbUtilityMeterData> = await firstValueFrom(this.utilityMeterDataDbService.getAll());
    let accountMeterData: Array<IdbUtilityMeterData> = allMeterData.filter(data => { return data.accountId = account.guid });
    this.utilityMeterDataDbService.accountMeterData.next(accountMeterData)
  }

  async initilizeMeterGroups(account: IdbAccount) {
    //set meter groups
    this.loadingMessage = "Loading Groups..";
    let allMeterGroups: Array<IdbUtilityMeterGroup> = await firstValueFrom(this.utilityMeterGroupDbService.getAll());
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = allMeterGroups.filter(meterGroup => { return meterGroup.accountId == account.guid });
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountMeterGroups);
  }


  async initializeCustomEmissions(account: IdbAccount) {
    this.loadingMessage = 'Loading Emissions Rates...';
    let allCustomEmissionsItems: Array<IdbCustomEmissionsItem> = await firstValueFrom(this.customEmissionsDbService.getAll());
    let customEmissionsItems: Array<IdbCustomEmissionsItem> = allCustomEmissionsItems.filter(item => { return item.accountId == account.guid });
    if (customEmissionsItems.length == 0) {
      let uSAverageItem: IdbCustomEmissionsItem = this.customEmissionsDbService.getUSAverage(account);
      uSAverageItem = await firstValueFrom(this.customEmissionsDbService.addWithObservable(uSAverageItem));
      customEmissionsItems.push(uSAverageItem);
    }
    await this.eGridService.parseEGridData();
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
  }
}
