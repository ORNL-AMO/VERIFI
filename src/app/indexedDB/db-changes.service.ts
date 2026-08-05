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
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { FacilityReportsDbService } from './facility-reports-db.service';
import { IdbFacilityReport } from '../models/idbModels/facilityReport';
import { EGridService } from '../shared/helper-services/e-grid.service';
import { FacilityEnergyUseGroupsDbService } from './facility-energy-use-groups-db.service';
import { IdbFacilityEnergyUseGroup } from '../models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseEquipmentDbService } from './facility-energy-use-equipment-db.service';
import { IdbFacilityEnergyUseEquipment } from '../models/idbModels/facilityEnergyUseEquipment';
import { resolveInitialFacility } from './selection-resolvers';
import { FACILITY_DELETION_MESSAGES } from './facility-deletion.config';
import { IndexedDbCascadeDeleteService } from './indexed-db-cascade-delete.service';
import { AnalysisSelectionRepairService } from './analysis-selection-repair.service';

@Injectable({
  providedIn: 'root'
})
export class DbChangesService {

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService, private analysisDbService: AnalysisDbService,
    private predictorsDbServiceDeprecated: PredictordbServiceDeprecated, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private analysisSelectionRepair: AnalysisSelectionRepairService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private accountReportDbService: AccountReportDbService,
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private cascadeDeleteService: IndexedDbCascadeDeleteService) { }

  async updateAccount(account: IdbAccount) {
    let updatedAccount: IdbAccount = await firstValueFrom(this.accountDbService.updateWithObservable(account));
    let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(accounts);
    this.accountDbService.selectedAccount.next(updatedAccount);
  }


  async selectAccount(account: IdbAccount, skipUpdates: boolean) {
    const storedFacilityId = this.facilityDbService.getInitialFacility();
    this.clearFacilitySelection();

    //set account facilities
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(account.guid);
    this.facilityDbService.accountFacilities.next(accountFacilites);
    //set reports
    await this.setAccountReports(account);
    //set predictors
    //TODO: deprecated, remove...?
    this.predictorsDbServiceDeprecated.accountPredictorEntries.next([]);
    await this.setPredictorsV2(account);
    await this.setPredictorDataV2(account, skipUpdates);
    //set meters
    await this.setMeters(account);
    //set meter data
    await this.setMeterData(account, skipUpdates);
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
    //set facility energy use groups
    await this.setAccountFacilityEnergyUseGroups(account);
    //set facility energy use equipment
    await this.setAccountFacilityEnergyUseEquipment(account);

    //set account 
    this.accountDbService.selectedAccount.next(account);
    await this.updateFacilityAnalysisSelectedItems();

    const selectedFacility = resolveInitialFacility(
      account,
      this.facilityDbService.accountFacilities.getValue(),
      storedFacilityId
    );
    if (selectedFacility) {
      this.selectFacility(selectedFacility);
    } else if (storedFacilityId !== undefined && storedFacilityId !== null) {
      this.facilityDbService.clearInitialFacility();
    }
  }

  selectFacility(facility: IdbFacility) {
    this.setFacilitySelection(facility);
  }

  clearFacilitySelection() {
    this.facilityDbService.selectedFacility.next(undefined);
    this.predictorsDbServiceDeprecated.facilityPredictorEntries.next([]);
    this.predictorsDbServiceDeprecated.facilityPredictors.next([]);
    this.predictorDbService.facilityPredictors.next([]);
    this.predictorDataDbService.facilityPredictorData.next([]);
    this.utilityMeterDbService.facilityMeters.next([]);
    this.utilityMeterDbService.selectedMeter.next(undefined);
    this.utilityMeterDataDbService.facilityMeterData.next([]);
    this.utilityMeterGroupDbService.facilityMeterGroups.next([]);
    this.analysisDbService.facilityAnalysisItems.next([]);
    this.analysisDbService.selectedAnalysisItem.next(undefined);
    this.analysisDbService.clearGeneratedModels();
    this.facilityReportsDbService.facilityReports.next([]);
    this.facilityReportsDbService.selectedReport.next(undefined);
    this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.next([]);
    this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.next([]);
  }

  setFacilitySelection(facility: IdbFacility) {
    this.clearFacilitySelection();

    const deprecatedPredictorEntries = this.predictorsDbServiceDeprecated.accountPredictorEntries.getValue()
      .filter(item => item.facilityId == facility.guid);
    const deprecatedPredictors = deprecatedPredictorEntries
      .flatMap(entry => entry.predictors ?? []);
    this.predictorsDbServiceDeprecated.facilityPredictorEntries.next(deprecatedPredictorEntries);
    this.predictorsDbServiceDeprecated.facilityPredictors.next(deprecatedPredictors);

    this.setFacilityPredictorsV2(facility);
    this.setFacilityPredictorDataV2(facility);
    this.setFacilityMeters(facility);
    this.setFacilityMeterData(facility);
    this.setFacilityMeterGroups(facility);
    this.setFacilityAnalysisItems(facility);
    this.setFacilityReports(facility);
    this.setFacilityEnergyUseGroups(facility);
    this.setFacilityEnergyUseEquipment(facility);
    this.facilityDbService.selectedFacility.next(facility);
  }

  async setAccountAnalysisItems(account: IdbAccount, skipUpdates: boolean) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = await this.accountAnalysisDbService.getAllAccountAnalysisItems(account.guid);
    if (!skipUpdates) {
      let updateAccount = this.analysisSelectionRepair.repairAccount(account, accountAnalysisItems);
      if (updateAccount.isChanged) {
        account = updateAccount.account;
        await this.updateAccount(account);
      }
    }
    this.accountAnalysisDbService.accountAnalysisItems.next(accountAnalysisItems);
  }

  async setAnalysisItems(account: IdbAccount, skipUpdates: boolean, facility?: IdbFacility) {
    let analysisItems: Array<IdbAnalysisItem> = await this.analysisDbService.getAllAccountAnalysisItems(account.guid);
    if (!skipUpdates) {
      if (facility) {
        let updateFacility = this.analysisSelectionRepair.repairFacility(facility, analysisItems);
        if (updateFacility.isChanged) {
          facility = updateFacility.facility;
          await this.updateFacility(facility);
        }
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

  //facility energy uses
  async setAccountFacilityEnergyUseGroups(account: IdbAccount, facility?: IdbFacility) {
    let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = await this.facilityEnergyUseGroupsDbService.getAllAccountEnergyUseGroups(account.guid);
    this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups.next(facilityEnergyUseGroups);
    if (facility) {
      this.setFacilityEnergyUseGroups(facility);
    }
  }

  setFacilityEnergyUseGroups(facility: IdbFacility) {
    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups.getValue();
    let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = accountEnergyUseGroups.filter(item => { return item.facilityId == facility.guid });
    this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.next(facilityEnergyUseGroups);
  }

  //facility energy uses
  async setAccountFacilityEnergyUseEquipment(account: IdbAccount, facility?: IdbFacility) {
    let facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = await this.facilityEnergyUseEquipmentDbService.getAllAccountEnergyUseEquipment(account.guid);
    this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment.next(facilityEnergyUseEquipment);
    if (facility) {
      this.setFacilityEnergyUseEquipment(facility);
    }
  }

  setFacilityEnergyUseEquipment(facility: IdbFacility) {
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment.getValue();
    let facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = accountEnergyUseEquipment.filter(item => { return item.facilityId == facility.guid });
    this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.next(facilityEnergyUseEquipment);
  }

  async updateFacility(facility: IdbFacility): Promise<IdbFacility> {
    const selectedFacilityGuid = this.facilityDbService.selectedFacility.getValue()?.guid;
    let updatedFacility: IdbFacility = await firstValueFrom(this.facilityDbService.updateWithObservable(facility));
    let accountFacilites: Array<IdbFacility> = await this.facilityDbService.getAllAccountFacilities(facility.accountId);
    this.facilityDbService.accountFacilities.next(accountFacilites);
    if (selectedFacilityGuid === updatedFacility.guid) {
      this.facilityDbService.selectedFacility.next(updatedFacility);
    }
    return updatedFacility;
  }

  async setAccountReports(account: IdbAccount) {
    let accountReports: Array<IdbAccountReport> = await this.accountReportDbService.getAllAccountReports(account.guid);
    this.accountReportDbService.accountReports.next(accountReports);
  }

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
  async setPredictorDataV2(account: IdbAccount, skipUpdates: boolean, facility?: IdbFacility) {
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

  async setMeterData(account: IdbAccount, skipUpdates: boolean, facility?: IdbFacility) {
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

  deleteFacilityMessages() {
    for (const message of FACILITY_DELETION_MESSAGES) {
      this.loadingService.addLoadingMessage(message);
    }
  }

  async deleteFacility(facility: IdbFacility, selectedAccount: IdbAccount, showLoading: boolean = true): Promise<number> {
    let currIdx = -1;
    if (showLoading) {
      this.loadingService.setContext('delete-facility');
      this.loadingService.setTitle('Deleting Facility');
    }

    try {
      await this.cascadeDeleteService.deleteFacility(facility, selectedAccount.guid, phase => {
        currIdx = phase.index - 1;
        if (showLoading) {
          this.loadingService.setCurrentLoadingIndex(currIdx);
        }
      });
    } catch (error) {
      this.toastNotificationService.showToast(
        'Facility Deletion Failed',
        'The facility and its related data were not deleted. Please try again.',
        15000,
        false,
        'alert-danger'
      );
      throw error;
    }

    try {
      await this.selectAccount(selectedAccount, false);
    } catch (error) {
      this.toastNotificationService.showToast(
        'Facility Refresh Failed',
        'The facility was deleted, but the account view could not be refreshed.',
        15000,
        false,
        'alert-danger'
      );
      throw error;
    }

    if (showLoading) {
      this.loadingService.isLoadingComplete.next(true);
    }
    return currIdx;
  }

  async updateDataNewFacility(newFacility: IdbFacility) {
    this.loadingService.setLoadingMessage('Updating Reports...');
    let accountReports: Array<IdbAccountReport> = this.accountReportDbService.accountReports.getValue();
    for (let index = 0; index < accountReports.length; index++) {
      if (accountReports[index].dataOverviewReportSetup) {
        accountReports[index].dataOverviewReportSetup.includedFacilities.push({
          facilityId: newFacility.guid,
          included: false,
          includedGroups: []
        });
      }
      if (accountReports[index].betterClimateReportSetup) {
        accountReports[index].betterClimateReportSetup.includedFacilityGroups.push({
          facilityId: newFacility.guid,
          include: false,
          groups: []
        });
      }
      await firstValueFrom(this.accountReportDbService.updateWithObservable(accountReports[index]));
    }
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      if (accountAnalysisItems[index].facilityAnalysisItems) {
        accountAnalysisItems[index].facilityAnalysisItems.push({
          facilityId: newFacility.guid,
          analysisItemId: undefined
        });
      }
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
    }
  }

  async updateFacilityAnalysisSelectedItems() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    for (let facility of facilities) {
      let updateFacility = this.analysisSelectionRepair.repairFacility(facility, facilityAnalysisItems);
      if (updateFacility.isChanged) {
        facility = updateFacility.facility;
        await this.updateFacility(facility);
      }
    }
  }
}
