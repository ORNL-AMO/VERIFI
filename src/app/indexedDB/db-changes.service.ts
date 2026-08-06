import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountWorkspaceService } from '../account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { LoadingService } from '../core-components/loading/loading.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbAccountAnalysisItem } from '../models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from '../models/idbModels/accountReport';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbFacility } from '../models/idbModels/facility';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { AccountdbService } from './account-db.service';
import { AccountReportDbService } from './account-report-db.service';
import { AnalysisSelectionRepairService } from './analysis-selection-repair.service';
import { FACILITY_DELETION_MESSAGES } from './facility-deletion.config';
import { FacilitydbService } from './facility-db.service';
import { IndexedDbCascadeDeleteService } from './indexed-db-cascade-delete.service';

@Injectable({
  providedIn: 'root'
})
export class DbChangesService {
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private analysisSelectionRepair: AnalysisSelectionRepairService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private accountReportDbService: AccountReportDbService,
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


  async updateFacility(facility: IdbFacility): Promise<IdbFacility> {
    const updatedFacility = await firstValueFrom(this.facilityDbService.updateWithObservable({ ...facility }));
    if (this.workspaceStore.account()?.guid === updatedFacility.accountId) {
      await this.workspaceService.reloadActiveWorkspace(true);
    }
    return updatedFacility;
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

  async updateDataNewFacility(newFacility: IdbFacility, publish = true) {
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
    if (publish && this.workspaceStore.account()?.guid === newFacility.accountId) {
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
