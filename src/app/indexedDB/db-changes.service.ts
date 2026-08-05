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
import { AccountWorkspaceService } from '../account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';

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
    private cascadeDeleteService: IndexedDbCascadeDeleteService,
    private workspaceService: AccountWorkspaceService,
    private workspaceStore: AccountWorkspaceStore) { }

  async updateAccount(account: IdbAccount) {
    const updatedAccount = await firstValueFrom(this.accountDbService.updateWithObservable({ ...account }));
    if (this.workspaceStore.account()?.guid === updatedAccount.guid) {
      await this.workspaceService.reloadActiveWorkspace(true);
    }
    return updatedAccount;
  }


  async selectAccount(account: IdbAccount, _skipUpdates: boolean) {
    await this.workspaceService.selectAccount(account.guid);
  }

  selectFacility(facility: IdbFacility) {
    this.workspaceService.selectFacility(facility?.guid);
  }

  clearFacilitySelection() {
    this.workspaceService.selectFacility(undefined);
  }

  setFacilitySelection(facility: IdbFacility) {
    this.workspaceService.selectFacility(facility?.guid);
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
    await this.workspaceService.reloadActiveWorkspace(true);
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
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  //facility reports
  async setAccountFacilityReports(account: IdbAccount, facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  //facility energy uses
  async setAccountFacilityEnergyUseGroups(account: IdbAccount, facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  //facility energy uses
  async setAccountFacilityEnergyUseEquipment(account: IdbAccount, facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  async updateFacility(facility: IdbFacility): Promise<IdbFacility> {
    const updatedFacility = await firstValueFrom(this.facilityDbService.updateWithObservable({ ...facility }));
    if (this.workspaceStore.account()?.guid === updatedFacility.accountId) {
      await this.workspaceService.reloadActiveWorkspace(true);
    }
    return updatedFacility;
  }

  async setAccountReports(account: IdbAccount) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  //Predictors V2
  async setPredictorsV2(_account: IdbAccount, _facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  //Predictor Data V2
  async setPredictorDataV2(_account: IdbAccount, _skipUpdates: boolean, _facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  async setMeters(_account: IdbAccount, _facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  async setMeterData(_account: IdbAccount, _skipUpdates: boolean, _facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  async setMeterGroups(_account: IdbAccount, _facility?: IdbFacility) {
    await this.workspaceService.reloadActiveWorkspace(true);
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
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  async setCustomFuels(account: IdbAccount) {
    await this.workspaceService.reloadActiveWorkspace(true);
  }

  async setCustomGWPS(account: IdbAccount) {
    await this.workspaceService.reloadActiveWorkspace(true);
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
      if (this.workspaceStore.account()?.guid === selectedAccount.guid) {
        await this.workspaceService.reloadActiveWorkspace(true);
      }
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
    let accountReports: Array<IdbAccountReport> = [...this.workspaceStore.accountReports()];
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
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.workspaceStore.accountAnalyses()];
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      if (accountAnalysisItems[index].facilityAnalysisItems) {
        accountAnalysisItems[index].facilityAnalysisItems.push({
          facilityId: newFacility.guid,
          analysisItemId: undefined
        });
      }
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
    }
    if (this.workspaceStore.account()?.guid === newFacility.accountId) {
      await this.workspaceService.reloadActiveWorkspace(true);
    }
  }

  async updateFacilityAnalysisSelectedItems() {
    let facilities: Array<IdbFacility> = this.workspaceStore.facilities().map(facility => ({ ...facility }));
    let facilityAnalysisItems: Array<IdbAnalysisItem> = [...this.workspaceStore.facilityAnalyses()];
    for (let facility of facilities) {
      let updateFacility = this.analysisSelectionRepair.repairFacility(facility, facilityAnalysisItems);
      if (updateFacility.isChanged) {
        facility = updateFacility.facility;
        await this.updateFacility(facility);
      }
    }
  }
}
