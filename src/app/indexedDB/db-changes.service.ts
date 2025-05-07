import { Injectable } from '@angular/core';
import { LoadingService } from '../core-components/loading/loading.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { AccountdbService } from './account-db.service';
import { AccountReportDbService } from './account-report-db.service';
import { AnalysisDbService } from './analysis-db.service';
import { CustomEmissionsDbService } from './custom-emissions-db.service';
import { FacilitydbService } from './facility-db.service';
import { PredictordbServiceDeprecated } from './predictors-deprecated-db.service';
import { UpdateDbEntryService } from './update-db-entry.service';
import { UtilityMeterdbService } from './utilityMeter-db.service';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';
import { firstValueFrom } from 'rxjs';
import { CustomFuelDbService } from './custom-fuel-db.service';
import { CustomGWPDbService } from './custom-gwp-db.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { IdbCustomGWP } from '../models/idbModels/customGWP';
import { IdbCustomFuel } from '../models/idbModels/customFuel';
import { IdbCustomEmissionsItem } from '../models/idbModels/customEmissions';
import { PredictorDbService } from './predictor-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';
import { IdbPredictor } from '../models/idbModels/predictor';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { MigratePredictorsService } from './migrate-predictors.service';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbPredictorEntryDeprecated } from '../models/idbModels/deprecatedPredictors';
import { FacilityReportsDbService } from './facility-reports-db.service';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { EGridService } from '../shared/helper-services/e-grid.service';

@Injectable({
  providedIn: 'root'
})
export class DbChangesService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService, private analysisDbService: AnalysisDbService,
    private predictorsDbServiceDeprecated: PredictordbServiceDeprecated, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private updateDbEntryService: UpdateDbEntryService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private accountReportDbService: AccountReportDbService,
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private migratePredictorsService: MigratePredictorsService,
    private facilityReportsDbService: FacilityReportsDbService) { }

  async updateAccount(account: IdbAccount) {
    let updatedAccount: IdbAccount = await firstValueFrom(this.accountDbService.updateWithObservable(account));
    let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(accounts);
    this.accountDbService.selectedAccount.next(updatedAccount);
  }


  async selectAccount(account: IdbAccount, skipUpdates: boolean) {
    if (!skipUpdates) {
      let updateAccount: { account: IdbAccount, isChanged: boolean } = this.updateDbEntryService.updateAccount(account);
      if (updateAccount.isChanged) {
        account = updateAccount.account;
        await this.updateAccount(account)
      }
    }


    //set account facilities
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(account.guid);
    if (!skipUpdates) {
      for (let i = 0; i < accountFacilites.length; i++) {
        let facility: IdbFacility = accountFacilites[i];
        let updatedFacility: { facility: IdbFacility, isChanged: boolean } = this.updateDbEntryService.updateFacility(facility);
        if (updatedFacility.isChanged) {
          accountFacilites[i] = updatedFacility.facility;
          await firstValueFrom(this.facilityDbService.updateWithObservable(updatedFacility.facility));
        }
      }
    }
    this.facilityDbService.accountFacilities.next(accountFacilites);
    //set reports
    await this.setAccountReports(account);
    //set predictors
    //TODO: deprecated, remove...?
    let needsMigration = await this.setPredictorsDeprecated(account);
    await this.setPredictorsV2(account);
    await this.setPredictorDataV2(account);
    //set meters
    await this.setMeters(account);
    //set meter data
    await this.setMeterData(account);
    //set meter groups
    await this.setMeterGroups(account);
    //set custom emissions
    await this.setCustomEmissions(account);
    //set custom fuels
    await this.setCustomFuels(account);
    //set custom GWPs
    await this.setCustomGWPS(account);
    //set analysis
    await this.setAnalysisItems(account, skipUpdates);
    //set facility reports
    await this.setAccountFacilityReports(account);
    //set account analysis
    await this.setAccountAnalysisItems(account, skipUpdates);
    this.accountDbService.selectedAccount.next(account);
    if (needsMigration) {
      await this.migratePredictorsService.migrateAccountPredictors();
      await this.setPredictorsV2(account);
      await this.setPredictorDataV2(account);
    }
  }

  selectFacility(facility: IdbFacility) {
    let updateFacility: { facility: IdbFacility, isChanged: boolean } = this.updateDbEntryService.updateFacility(facility);
    if (updateFacility.isChanged) {
      facility = updateFacility.facility;
      this.updateFacilities(facility, true);
    }
    //set predictors
    // this.setFacilityPredictorsDeprecated(facility);
    this.setFacilityPredictorsV2(facility);
    this.setFacilityPredictorDataV2(facility);
    //set meters
    this.setFacilityMeters(facility);
    //set meter data
    this.setFacilityMeterData(facility);
    //set meter groups
    this.setFacilityMeterGroups(facility);
    //set analaysis
    this.setFacilityAnalysisItems(facility);
    //set reports
    this.setFacilityReports(facility);
    this.facilityDbService.selectedFacility.next(facility);
  }

  async setAccountAnalysisItems(account: IdbAccount, skipUpdates: boolean) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllAccountAnalysisItems(account.guid);
    if (!skipUpdates) {
      let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
      for (let i = 0; i < accountAnalysisItems.length; i++) {
        let updateAnalysis: { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAccountAnalysis(accountAnalysisItems[i], account, facilityAnalysisItems);
        if (updateAnalysis.isChanged) {
          accountAnalysisItems[i] = updateAnalysis.analysisItem;
          await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
        };
      }
    }
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
  }

  async setAnalysisItems(account: IdbAccount, skipUpdates: boolean, facility?: IdbFacility) {
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllAccountAnalysisItems(account.guid);
    if (!skipUpdates) {
      for (let i = 0; i < analysisItems.length; i++) {
        let updateAnalysis: { analysisItem: IdbAnalysisItem, isChanged: boolean } = this.updateDbEntryService.updateAnalysis(analysisItems[i]);
        if (updateAnalysis.isChanged) {
          analysisItems[i] = updateAnalysis.analysisItem;
          await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItems[i]));
        };
      }
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

  //facility reports
  async setAccountFacilityReports(account: IdbAccount, facility?: IdbFacility) {
    let accountFacilityReports: Array<IdbFacilityReport> = await this.facilityReportsDbService.getAllFacilityReportsByAccountId(account.guid);
    this.facilityReportsDbService.accountFacilityReports.next(accountFacilityReports);
    if (facility) {
      this.setFacilityReports(facility);
    }
  }

  setFacilityReports(facility: IdbFacility) {
    let accountFacilityReports: Array<IdbFacilityReport> = this.facilityReportsDbService.accountFacilityReports.getValue();
    let facilityReports: Array<IdbFacilityReport> = accountFacilityReports.filter(item => { return item.facilityId == facility.guid });
    this.facilityReportsDbService.facilityReports.next(facilityReports);
  }

  async updateFacilities(selectedFacility: IdbFacility, onSelect?: boolean) {
    let updatedFacility: IdbFacility = await firstValueFrom(this.facilityDbService.updateWithObservable(selectedFacility));
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(selectedFacility.accountId);
    this.facilityDbService.accountFacilities.next(accountFacilites);
    if (!onSelect) {
      this.facilityDbService.selectedFacility.next(updatedFacility);
    }
  }

  async setAccountReports(account: IdbAccount) {
    let accountReports: Array<IdbAccountReport> = await this.accountReportDbService.getAllAccountReports(account.guid);
    this.accountReportDbService.accountReports.next(accountReports);
  }

  //Deprecated Predictor data
  async setPredictorsDeprecated(account: IdbAccount, facility?: IdbFacility): Promise<boolean> {
    let needsMigration: boolean = false;

    let predictors: Array<IdbPredictorEntryDeprecated> = await this.predictorsDbServiceDeprecated.getAllAccountPredictors(account.guid);
    this.predictorsDbServiceDeprecated.accountPredictorEntries.next(predictors);
    if (predictors.length > 0) {
      needsMigration = true;
    }
    return needsMigration;
  }

  // setFacilityPredictorsDeprecated(facility: IdbFacility) {
  //   let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.predictorsDbServiceDeprecated.accountPredictorEntries.getValue();
  //   let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(item => { return item.facilityId == facility.guid });
  //   this.predictorsDbServiceDeprecated.facilityPredictorEntries.next(facilityPredictorEntries);
  //   if (facilityPredictorEntries.length != 0) {
  //     this.predictorsDbServiceDeprecated.facilityPredictors.next(facilityPredictorEntries[0].predictors);
  //   } else {
  //     this.predictorsDbServiceDeprecated.facilityPredictors.next([]);
  //   }
  // }

  //Predictors V2
  async setPredictorsV2(account: IdbAccount, facility?: IdbFacility) {
    let predictors: Array<IdbPredictor> = await this.predictorDbService.getAllAccountPredictors(account.guid);
    this.predictorDbService.accountPredictors.next(predictors);
    if (facility) {
      this.setFacilityPredictorsV2(facility);
    }
  }

  setFacilityPredictorsV2(facility: IdbFacility) {
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let facilityPredictorEntries: Array<IdbPredictor> = accountPredictors.filter(item => { return item.facilityId == facility.guid });
    this.predictorDbService.facilityPredictors.next(facilityPredictorEntries);
  }

  //Predictor Data V2
  async setPredictorDataV2(account: IdbAccount, facility?: IdbFacility) {
    let predictorData: Array<IdbPredictorData> = await this.predictorDataDbService.getAllAccountPredictorData(account.guid);
    this.predictorDataDbService.accountPredictorData.next(predictorData);
    if (facility) {
      this.setFacilityPredictorDataV2(facility);
    }
  }

  setFacilityPredictorDataV2(facility: IdbFacility) {
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let facilityPredictorData: Array<IdbPredictorData> = accountPredictorData.filter(item => { return item.facilityId == facility.guid });
    this.predictorDataDbService.facilityPredictorData.next(facilityPredictorData);
  }

  async setMeters(account: IdbAccount, facility?: IdbFacility) {
    let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterDbService.getAllAccountMeters(account.guid);
    for (let i = 0; i < accountMeters.length; i++) {
      let updateMeter: { utilityMeter: IdbUtilityMeter, isChanged: boolean } = this.updateDbEntryService.updateUtilityMeter(accountMeters[i]);
      if (updateMeter.isChanged) {
        accountMeters[i] = updateMeter.utilityMeter;
        await firstValueFrom(this.utilityMeterDbService.updateWithObservable(accountMeters[i]));
      };
    }
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
    if (customEmissionsItems.length != 0) {
      for (let i = 0; i < customEmissionsItems.length; i++) {
        if (customEmissionsItems[i].subregion == 'U.S. Average') {
          await this.customEmissionsDbService.deleteWithObservable(customEmissionsItems[i].id)
          customEmissionsItems = customEmissionsItems.filter(item => { return item.guid != customEmissionsItems[i].guid })
        } else {
          customEmissionsItems[i].locationEmissionRates.forEach(rate => {
            if (rate.CH4 == undefined) {
              rate.CH4 = 0;
            }
            if (rate.CO2 == undefined) {
              rate.CO2 = 0;
            }
            if (rate.N2O == undefined) {
              rate.N2O = 0;
            }
          })
          customEmissionsItems[i].residualEmissionRates.forEach(rate => {
            if (rate.CH4 == undefined) {
              rate.CH4 = 0;
            }
            if (rate.CO2 == undefined) {
              rate.CO2 = 0;
            }
            if (rate.N2O == undefined) {
              rate.N2O = 0;
            }
          });
          await this.customEmissionsDbService.updateWithObservable(customEmissionsItems[i]);
        }
      }
    }
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
  }

  async setCustomFuels(account: IdbAccount) {
    let customFuels: Array<IdbCustomFuel> = await this.customFuelDbService.getAllAccountCustomFuels(account.guid);
    this.customFuelDbService.accountCustomFuels.next(customFuels);
  }

  async setCustomGWPS(account: IdbAccount) {
    let customGWPs: Array<IdbCustomGWP> = await this.customGWPDbService.getAllAccountCustomGWP(account.guid);
    this.customGWPDbService.accountCustomGWPs.next(customGWPs);
  }

  async deleteFacility(facility: IdbFacility, selectedAccount: IdbAccount) {
    this.loadingService.setLoadingStatus(true);

    // Delete all info associated with account
    this.loadingService.setLoadingMessage("Deleting Facility Predictors...");
    await this.predictorsDbServiceDeprecated.deleteAllFacilityPredictors(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Predictor Data...");
    await this.predictorDbService.deleteAllFacilityPredictors(facility.guid);
    await this.predictorDataDbService.deleteAllFacilityPredictorData(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Data...");
    await this.utilityMeterDataDbService.deleteAllFacilityMeterData(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meters...");
    await this.utilityMeterDbService.deleteAllFacilityMeters(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Facility Reports...");
    await this.facilityReportsDbService.deleteFacilityReports(facility.guid);
    this.loadingService.setLoadingMessage("Updating Account Reports...")
    await this.accountReportDbService.updateReportsRemoveFacility(facility.guid);
    this.loadingService.setLoadingMessage("Deleting Account Analysis Items...")
    await this.analysisDbService.deleteAllFacilityAnalysisItems(facility.guid);
    this.loadingService.setLoadingMessage('Updating Account Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      accountAnalysisItems[index].facilityAnalysisItems = accountAnalysisItems[index].facilityAnalysisItems.filter(facilityItem => { return facilityItem.facilityId != facility.guid });
      this.loadingService.setLoadingMessage('Updating Account Analysis Items (' + index + '/' + accountAnalysisItems.length + ')...');
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
    }
    this.loadingService.setLoadingMessage("Deleting Facility...");
    await this.facilityDbService.deleteFacilitiesAsync([facility]);
    await this.selectAccount(selectedAccount, false);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Deleted!', undefined, undefined, false, 'alert-success');
  }
}
