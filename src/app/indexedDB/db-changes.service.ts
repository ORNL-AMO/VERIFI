import { Injectable } from '@angular/core';
import { LoadingService } from '../core-components/loading/loading.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbCustomEmissionsItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from '../models/idb';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { AccountdbService } from './account-db.service';
import { AccountReportDbService } from './account-report-db.service';
import { AnalysisDbService } from './analysis-db.service';
import { CustomEmissionsDbService } from './custom-emissions-db.service';
import { FacilitydbService } from './facility-db.service';
import { OverviewReportOptionsDbService } from './overview-report-options-db.service';
import { PredictordbService } from './predictors-db.service';
import { UpdateDbEntryService } from './update-db-entry.service';
import { UtilityMeterdbService } from './utilityMeter-db.service';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';
import { first, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DbChangesService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService, private analysisDbService: AnalysisDbService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private predictorsDbService: PredictordbService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private updateDbEntryService: UpdateDbEntryService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private accountReportDbService: AccountReportDbService) { }

  async updateAccount(account: IdbAccount) {
    let updatedAccount: IdbAccount = await firstValueFrom(this.accountDbService.updateWithObservable(account));
    let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(accounts);
    this.accountDbService.selectedAccount.next(updatedAccount);
  }


  async selectAccount(account: IdbAccount) {
    let updateAccount: { account: IdbAccount, isChanged: boolean } = this.updateDbEntryService.updateAccount(account);
    if (updateAccount.isChanged) {
      account = updateAccount.account;
      await this.updateAccount(account)
    }
    //set account facilities
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(account.guid);
    for (let i = 0; i < accountFacilites.length; i++) {
      let facility: IdbFacility = accountFacilites[i];
      let updatedFacility: { facility: IdbFacility, isChanged: boolean } = this.updateDbEntryService.updateFacility(facility);
      if (updatedFacility.isChanged) {
        accountFacilites[i] = updatedFacility.facility;
        await firstValueFrom(this.facilityDbService.updateWithObservable(updatedFacility.facility));
      }
    }
    this.facilityDbService.accountFacilities.next(accountFacilites);
    //set overview reports
    await this.setAccountOverviewReportOptions(account);
    //set reports
    await this.setAccountReports(account);
    //set predictors
    await this.setPredictors(account);
    //set meters
    await this.setMeters(account);
    //set meter data
    await this.setMeterData(account);
    //set meter groups
    await this.setMeterGroups(account);
    //set custom emissions
    await this.setCustomEmissions(account);
    //set analysis
    await this.setAnalysisItems(account);
    //set account analysis
    await this.setAccountAnalysisItems(account);

    this.accountDbService.selectedAccount.next(account);
  }

  selectFacility(facility: IdbFacility) {
    facility = this.updateDbEntryService.updateFacility(facility).facility;
    this.updateFacilities(facility, true);
    console.log('DB Changes Select Facility');
    //set predictors
    this.setFacilityPredictors(facility);
    //set meters
    this.setFacilityMeters(facility);
    //set meter data
    this.setFacilityMeterData(facility);
    //set meter groups
    this.setFacilityMeterGroups(facility);
    //set analaysis
    this.setFacilityAnalysisItems(facility);
    this.facilityDbService.selectedFacility.next(facility);
  }

  async setAccountAnalysisItems(account: IdbAccount) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllAccountAnalysisItems(account.guid);
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      let updateAnalysis: { accountAnalysisItem: IdbAccountAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAccountAnalysis(accountAnalysisItems[i]);
      if (updateAnalysis.isChanged) {
        accountAnalysisItems[i] = updateAnalysis.accountAnalysisItem;
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
      };
    }
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
  }

  async setAnalysisItems(account: IdbAccount, facility?: IdbFacility) {
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllAccountAnalysisItems(account.guid);
    for (let i = 0; i < analysisItems.length; i++) {
      let updateAnalysis: { analysisItem: IdbAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAnalysis(analysisItems[i]);
      if (updateAnalysis.isChanged) {
        analysisItems[i] = updateAnalysis.analysisItem;
        await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItems[i]));
      };
    }
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

  async updateFacilities(selectedFacility: IdbFacility, onSelect?: boolean) {
    let updatedFacility: IdbFacility = await firstValueFrom(this.facilityDbService.updateWithObservable(selectedFacility));
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(selectedFacility.accountId);
    this.facilityDbService.accountFacilities.next(accountFacilites);
    if (!onSelect) {
      this.facilityDbService.selectedFacility.next(updatedFacility);
    }
  }


  async setAccountOverviewReportOptions(account: IdbAccount) {
    let overviewReportOptions: Array<IdbOverviewReportOptions> = await this.overviewReportOptionsDbService.getAllAccountReports(account.guid);
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
  }

  async setAccountReports(account: IdbAccount) {
    let accountReports: Array<IdbAccountReport> = await this.accountReportDbService.getAllAccountReports(account.guid);
    this.accountReportDbService.accountReports.next(accountReports);
  }

  async setPredictors(account: IdbAccount, facility?: IdbFacility) {
    let predictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllAccountPredictors(account.guid);
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
    let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllAccountMeters(account.guid);
    this.utilityMeterDbService.accountMeters.next(accountMeters);
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
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllAccountMeterData(account.guid);
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
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllAccountMeterGroups(account.guid);
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountMeterGroups);
    if (facility) {
      this.setFacilityMeterGroups(facility);
    }
  }

  setFacilityMeterGroups(facility: IdbFacility) {
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(item => { return item.facilityId == facility.guid });
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityMeterGroups);
  }


  async setCustomEmissions(account: IdbAccount) {
    let customEmissionsItems: Array<IdbCustomEmissionsItem> = await this.customEmissionsDbService.getAllAccountCustomEmissions(account.guid);
    if (customEmissionsItems.length == 0) {
      let uSAverageItem: IdbCustomEmissionsItem = this.customEmissionsDbService.getUSAverage(account);
      uSAverageItem = await firstValueFrom(this.customEmissionsDbService.addWithObservable(uSAverageItem));
      customEmissionsItems.push(uSAverageItem);
    }
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
  }

  async deleteFacility(facility: IdbFacility, selectedAccount: IdbAccount) {
    this.loadingService.setLoadingStatus(true);

    // Delete all info associated with account
    this.loadingService.setLoadingMessage("Deleting Facility Predictors...");
    await this.predictorsDbService.deleteAllFacilityPredictors(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Data...");
    await this.utilityMeterDataDbService.deleteAllFacilityMeterData(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meters...");
    await this.utilityMeterDbService.deleteAllFacilityMeters(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(facility.guid);
    this.loadingService.setLoadingMessage("Updating Reports...")
    await this.accountReportDbService.updateReportsRemoveFacility(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Analysis Items...")
    await this.analysisDbService.deleteAllFacilityAnalysisItems(facility.guid);
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      accountAnalysisItems[index].facilityAnalysisItems = accountAnalysisItems[index].facilityAnalysisItems.filter(facilityItem => { return facilityItem.facilityId != facility.guid });
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
    }

    this.loadingService.setLoadingMessage("Deleting Facility...");
    await this.facilityDbService.deleteFacilitiesAsync([facility]);
    await this.selectAccount(selectedAccount);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Deleted!', undefined, undefined, false, 'alert-success');
  }
}
