import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { PredictordbService } from "../../indexedDB/predictors-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { LoadingService } from "../../core-components/loading/loading.service";
import { BackupDataService } from '../backup-data.service';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  facilityList: Array<IdbFacility> = [];
  facilityMenuOpen: number;
  showDeleteAccount: boolean;
  facilityToEdit: IdbFacility;
  facilityToDelete: IdbFacility;

  selectedAccountSub: Subscription;
  accountFacilitiesSub: Subscription;
  selectedAccount: IdbAccount;
  showImportFile: boolean = false;
  constructor(
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private helpPanelService: HelpPanelService,
    private analysisDbService: AnalysisDbService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  switchFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigate(['/facility-management']);
  }

  addNewFacility() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let idbFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(selectedAccount);
    this.facilityDbService.add(idbFacility);
  }


  async facilityDelete() {
    this.loadingService.setLoadingStatus(true);

    // Delete all info associated with account
    this.loadingService.setLoadingMessage("Deleting Facility Predictors...");
    await this.predictorDbService.deleteAllFacilityPredictors(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Data...");
    await this.utilityMeterDataDbService.deleteAllFacilityMeterData(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meters...");
    await this.utilityMeterDbService.deleteAllFacilityMeters(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Updating Reports...")
    await this.overviewReportOptionsDbService.updateReportsRemoveFacility(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Analysis Items...")
    await this.analysisDbService.deleteAllFacilityAnalysisItems(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility...");
    await this.facilityDbService.deleteFacilitiesAsync([this.facilityToDelete]);
    let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
    // Then navigate to another facility
    this.facilityDbService.allFacilities.next(allFacilities);
    let accountFacilites: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedAccount.id });
    this.facilityDbService.accountFacilities.next(accountFacilites);
    this.facilityDbService.setSelectedFacility();
    this.loadingService.setLoadingStatus(false);
  }

  async confirmAccountDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();

    this.loadingService.setLoadingStatus(true);

    // Delete all info associated with account
    this.loadingService.setLoadingMessage("Deleting Account Predictors...");
    await this.predictorDbService.deleteAllSelectedAccountPredictors();
    this.loadingService.setLoadingMessage("Deleting Account Meter Data...");
    await this.utilityMeterDataDbService.deleteAllSelectedAccountMeterData();
    this.loadingService.setLoadingMessage("Deleting Account Meters...");
    await this.utilityMeterDbService.deleteAllSelectedAccountMeters();
    this.loadingService.setLoadingMessage("Deleting Account Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllSelectedAccountMeterGroups();
    this.loadingService.setLoadingMessage("Deleting Account Facilities...");
    await this.facilityDbService.deleteAllSelectedAccountFacilities();
    this.loadingService.setLoadingMessage("Deleting Reports...")
    await this.overviewReportOptionsDbService.deleteAccountReports();
    this.loadingService.setLoadingMessage("Deleting Analysis Items...")
    await this.analysisDbService.deleteAccountAnalysisItems();

    let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
    // Then navigate to another facility
    this.facilityDbService.allFacilities.next(allFacilities);
    this.facilityDbService.accountFacilities.next([]);
    this.facilityDbService.setSelectedFacility();

    this.loadingService.setLoadingMessage("Deleting Account...");
    await this.accountDbService.deleteAccountWithObservable(selectedAccount.id).toPromise();

    // Then navigate to another account
    let accounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
    this.accountDbService.allAccounts.next(accounts);
    if (accounts.length != 0) {
      this.accountDbService.setSelectedAccount(accounts[0].id);
    } else {
      this.accountDbService.setSelectedAccount(undefined);
    }
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);
  }

  setDeleteFacilityEntry(facility: IdbFacility) {
    this.facilityToDelete = facility;
  }

  closeEditFacility() {
    this.facilityToEdit = undefined;
  }

  editAccount() {
    this.showDeleteAccount = true;
  }

  async confirmFacilityDelete() {
    await this.facilityDelete();
    this.facilityToDelete = undefined;
  }

  cancelAccountDelete() {
    this.showDeleteAccount = undefined;
  }

  cancelFacilityDelete() {
    this.facilityToDelete = undefined;
  }

  backupAccount() {
    this.backupDataService.backupAccount();
  }

  openImportBackup() {
    this.showImportFile = true;
  }

  cancelImportBackup() {
    this.showImportFile = false;
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}
