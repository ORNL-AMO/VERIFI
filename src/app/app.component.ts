import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccountAnalysisDbService } from './indexedDB/account-analysis-db.service';
import { AccountdbService } from './indexedDB/account-db.service';
import { AccountReportDbService } from './indexedDB/account-report-db.service';
import { AnalysisDbService } from './indexedDB/analysis-db.service';
import { CustomEmissionsDbService } from './indexedDB/custom-emissions-db.service';
import { FacilitydbService } from './indexedDB/facility-db.service';
import { PredictordbService } from './indexedDB/predictors-db.service';
import { UpdateDbEntryService } from './indexedDB/update-db-entry.service';
import { UtilityMeterdbService } from './indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from './indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbCustomEmissionsItem, IdbCustomFuel, IdbCustomGWP, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from './models/idb';
import { EGridService } from './shared/helper-services/e-grid.service';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastNotificationsService } from './core-components/toast-notifications/toast-notifications.service';
import { AutomaticBackupsService } from './electron/automatic-backups.service';
import { ElectronBackupsDbService } from './indexedDB/electron-backups-db.service';
import { ElectronService } from './electron/electron.service';
import { AnalyticsService } from './analytics/analytics.service';
import { CustomFuelDbService } from './indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from './indexedDB/custom-gwp-db.service';

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
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private updateDbEntryService: UpdateDbEntryService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private accountReportDbService: AccountReportDbService,
    private toastNotificationService: ToastNotificationsService,
    private automaticBackupsService: AutomaticBackupsService,
    private electronBackupsDbService: ElectronBackupsDbService,
    private electronService: ElectronService,
    private analyticsService: AnalyticsService,
    private customFuelDbservice: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService) {
    if (environment.production) {
      gtag('config', 'G-YG1QD02XSE');
      this.analyticsService.sendEvent('verifi_app_open', undefined);
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          let page_path: string = this.analyticsService.getPageWithoutId(event.urlAfterRedirects);
          this.analyticsService.sendEvent('page_view', page_path);
        }
      });
    }
  }

  ngOnInit() {
    this.initializeData();
    this.automaticBackupsService.subscribeData();
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
        await this.initilizeMeterGroups(account);
        await this.initializeAccountReports(account);
        await this.initializePredictors(account);
        await this.initializeMeters(account);
        await this.initializeMeterData(account);
        await this.initializeFacilityAnalysisItems(account);
        await this.initializeAccountAnalysisItems(account);
        await this.initializeCustomEmissions(account);
        await this.initializeElectronBackups();
        await this.initializeCustomFuels(account);
        await this.initializeCustomGWPs(account);
        let updatedAccount: { account: IdbAccount, isChanged: boolean } = this.updateDbEntryService.updateAccount(account);
        if (updatedAccount.isChanged) {
          await firstValueFrom(this.accountDbService.updateWithObservable(updatedAccount.account));
          this.accountDbService.selectedAccount.next(updatedAccount.account);
        } else {
          this.accountDbService.selectedAccount.next(account);
        }
        this.dataInitialized = true;
        this.automaticBackupsService.initializeAccount();
      } else {
        await this.eGridService.parseEGridData();
        await this.initializeElectronBackups();

        this.dataInitialized = true;
        this.router.navigateByUrl('verifi');
      }
    } catch (err) {
      console.log(err);
      await this.eGridService.parseEGridData();
      await this.initializeElectronBackups();
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to initialize the application data.', 15000, false, 'alert-danger');
      this.router.navigateByUrl('/manage-accounts');
      this.dataInitialized = true;
    }
  }

  async initializeFacilities(account: IdbAccount) {
    this.loadingMessage = "Loading Facilities..";
    //set account facilities
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(account.guid);
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
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllAccountAnalysisItems(account.guid);
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      let updateAnalysis: { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAccountAnalysis(accountAnalysisItems[i], account, facilityAnalysisItems);
      if (updateAnalysis.isChanged) {
        accountAnalysisItems[i] = updateAnalysis.analysisItem;
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
      };
    }
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
    let localStorageAccountAnalysisId: number = this.accountAnalysisDbService.getInitialAnalysisItem();
    if (localStorageAccountAnalysisId) {
      let analysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.id == localStorageAccountAnalysisId });
      this.accountAnalysisDbService.selectedAnalysisItem.next(analysisItem);
    }
  }

  async initializeFacilityAnalysisItems(account: IdbAccount) {
    //set analysis
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllAccountAnalysisItems(account.guid);
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
    this.loadingMessage = "Loading Reports..."
    let accountReports: Array<IdbAccountReport> = await this.accountReportDbService.getAllAccountReports(account.guid);
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    for (let i = 0; i < accountReports.length; i++) {
      let updateReport: { report: IdbAccountReport, isChanged: boolean } = this.updateDbEntryService.updateReport(accountReports[i], facilities, groups);
      if (updateReport.isChanged) {
        accountReports[i] = updateReport.report;
        await firstValueFrom(this.accountReportDbService.updateWithObservable(accountReports[i]));
      };
    }
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
    let predictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllAccountPredictors(account.guid);
    this.predictorsDbService.accountPredictorEntries.next(predictors);
  }

  async initializeMeters(account: IdbAccount) {
    //set meters
    this.loadingMessage = "Loading Meters..";
    let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllAccountMeters(account.guid);
    for (let i = 0; i < accountMeters.length; i++) {
      let updateMeter: { utilityMeter: IdbUtilityMeter, isChanged: boolean } = this.updateDbEntryService.updateUtilityMeter(accountMeters[i]);
      if (updateMeter.isChanged) {
        accountMeters[i] = updateMeter.utilityMeter;
        await firstValueFrom(this.utilityMeterDbService.updateWithObservable(accountMeters[i]));
      };
    }
    this.utilityMeterDbService.accountMeters.next(accountMeters);
  }

  async initializeMeterData(account: IdbAccount) {
    //set meter data
    this.loadingMessage = "Loading Meter Data..";
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllAccountMeterData(account.guid);
    this.utilityMeterDataDbService.accountMeterData.next(accountMeterData)
  }

  async initilizeMeterGroups(account: IdbAccount) {
    //set meter groups
    this.loadingMessage = "Loading Groups..";
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllAccountMeterGroups(account.guid);
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountMeterGroups);
  }

  async initializeCustomEmissions(account: IdbAccount) {
    this.loadingMessage = 'Loading Emissions Rates...';
    let customEmissionsItems: Array<IdbCustomEmissionsItem> = await this.customEmissionsDbService.getAllAccountCustomEmissions(account.guid);
    if (customEmissionsItems.length == 0) {
      let uSAverageItem: IdbCustomEmissionsItem = this.customEmissionsDbService.getUSAverage(account);
      uSAverageItem = await firstValueFrom(this.customEmissionsDbService.addWithObservable(uSAverageItem));
      customEmissionsItems.push(uSAverageItem);
    }
    await this.eGridService.parseEGridData();
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
  }

  async initializeElectronBackups() {
    if (this.electronService.isElectron) {
      this.loadingMessage = 'Loading Account Backups...';
      this.electronBackupsDbService.accountBackups = await firstValueFrom(this.electronBackupsDbService.getAll());
    }
  }

  async initializeCustomFuels(account: IdbAccount) {
    this.loadingMessage = 'Loading Custom Fuels...';
    let customFuels: Array<IdbCustomFuel> = await this.customFuelDbservice.getAllAccountCustomFuels(account.guid);
    this.customFuelDbservice.accountCustomFuels.next(customFuels);
  }

  async initializeCustomGWPs(account: IdbAccount) {
    this.loadingMessage = 'Loading Custom GWPs...';
    let customGWPs: Array<IdbCustomGWP> = await this.customGWPDbService.getAllAccountCustomGWP(account.guid);
    this.customGWPDbService.accountCustomGWPs.next(customGWPs);
  }
}
