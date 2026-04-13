import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-analysis-details-table',
  standalone: false,

  templateUrl: './account-analysis-details-table.component.html',
  styleUrl: './account-analysis-details-table.component.css'
})
export class AccountAnalysisDetailsTableComponent {

  accountAnalysisItemsSub: Subscription;
  baselineYearErrorEnergy: boolean;
  baselineYearErrorWater: boolean;
  energyYearOptions: Array<number>;
  waterYearOptions: Array<number>;
  yearOptions: Array<number>;
  selectedAccount: IdbAccount;
  analysisItemsList: Array<IdbAccountAnalysisItem>;
  filteredAnalysisItems: Array<IdbAccountAnalysisItem>;

  selectedAnalysisCategory: 'energy' | 'water' | 'all' = 'all';
  displayDeleteModal: boolean = false;
  itemToDelete: IdbAccountAnalysisItem;
  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  orderDataField: string = 'name';
  orderByDirection: 'asc' | 'desc' = 'desc';

  selectedAccountSub: Subscription;
  showDeleteColumn: boolean = false;
  allChecked: boolean = false;
  showBulkDelete: boolean = false;

  constructor(
    private accountAnalysisDbService: AccountAnalysisDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService,
    private router: Router,
    private accountReportDbService: AccountReportDbService,
    private sharedDataService: SharedDataService,
    private calanderizationService: CalanderizationService,
    private loadingService: LoadingService
  ) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
    });
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.analysisItemsList = items;
      this.filteredAnalysisItems = this.analysisItemsList;
      this.selectedAnalysisCategory = 'all';
      this.filterAnalysisItems();
    });

    this.energyYearOptions = this.calanderizationService.getYearOptions('energy', true);
    this.waterYearOptions = this.calanderizationService.getYearOptions('water', true);
    this.yearOptions = _.uniq([...this.energyYearOptions, ...this.waterYearOptions]);
    this.yearOptions = _.orderBy(this.yearOptions, (year) => { return year }, 'asc');

    if (this.energyYearOptions && this.selectedAccount.sustainabilityQuestions.energyReductionGoal) {
      this.baselineYearErrorEnergy = this.energyYearOptions[0] > this.selectedAccount.sustainabilityQuestions.energyReductionBaselineYear;
    }
    if (this.waterYearOptions && this.selectedAccount.sustainabilityQuestions.waterReductionGoal) {
      this.baselineYearErrorWater = this.waterYearOptions[0] > this.selectedAccount.sustainabilityQuestions.waterReductionBaselineYear;
    }

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.accountAnalysisItemsSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  filterAnalysisItems() {
    this.filteredAnalysisItems = this.analysisItemsList
      .filter(item => {
        const categoryMatch = this.selectedAnalysisCategory === 'all' || item.analysisCategory === this.selectedAnalysisCategory;
        return categoryMatch;
      });
  }

  async setUseItem(analysisItem: IdbAccountAnalysisItem) {
    let canSelectItem: boolean = this.getCanSelectItem(this.selectedAccount, analysisItem);
    if (canSelectItem) {
      if (analysisItem.analysisCategory == 'energy') {
        this.selectedAccount.selectedEnergyAnalysisId = analysisItem.guid;
      } else if (analysisItem.analysisCategory == 'water') {
        this.selectedAccount.selectedWaterAnalysisId = analysisItem.guid;
      }
      await this.dbChangesService.updateAccount(this.selectedAccount);
    } else {
      this.toastNotificationService.showToast('Analysis Item Cannot Be Selected', "This baseline year does not match the account baseline year. This analysis cannot be included in reports or figures relating to the account energy goal.", 10000, false, 'alert-danger');
    }
  }

  getCanSelectItem(account: IdbAccount, analysisItem: IdbAccountAnalysisItem): boolean {
    if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.energyReductionBaselineYear) {
        return false
      } else {
        return true;
      }
    } else if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.waterReductionBaselineYear) {
        return false
      } else {
        return true;
      }
    }
  }

  selectAnalysisItem(analysisItem: IdbAccountAnalysisItem, setupErrors: AccountAnalysisSetupErrors) {
    this.accountAnalysisDbService.selectedAnalysisItem.next(analysisItem);
    if (setupErrors.hasError || setupErrors.facilitiesSelectionsInvalid) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
    } else {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results');
    }
  }

  deleteItem(analysisItem: IdbAccountAnalysisItem) {
    this.itemToDelete = analysisItem;
    this.displayDeleteModal = true;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete(item?: IdbAccountAnalysisItem, isBulkDelete: boolean = false) {
    const deletedItem = item ? item : this.itemToDelete;
    await firstValueFrom(this.accountAnalysisDbService.deleteWithObservable(deletedItem.id));
    let accountReports: Array<IdbAccountReport> = this.accountReportDbService.accountReports.getValue();
    let updateReportOptions: boolean = false;
    for (let i = 0; i < accountReports.length; i++) {
      if (accountReports[i].betterPlantsReportSetup.analysisItemId == deletedItem.guid) {
        accountReports[i].betterPlantsReportSetup.analysisItemId = undefined;
        await firstValueFrom(this.accountReportDbService.updateWithObservable(accountReports[i]));
        updateReportOptions = true;
      }
    }
    if (deletedItem.guid == this.selectedAccount.selectedEnergyAnalysisId) {
      this.selectedAccount.selectedEnergyAnalysisId = undefined;
      await this.dbChangesService.updateAccount(this.selectedAccount);
    } else if (deletedItem.guid == this.selectedAccount.selectedWaterAnalysisId) {
      this.selectedAccount.selectedWaterAnalysisId = undefined;
      await this.dbChangesService.updateAccount(this.selectedAccount);
    }
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
    if (!isBulkDelete) {
      this.displayDeleteModal = false;
      this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
    }
    this.analysisItemsList = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.filteredAnalysisItems = this.analysisItemsList;
    this.selectedAnalysisCategory = 'all';
  }

  bulkDeleteClicked() {
    this.showDeleteColumn = true;
  }

  anyChecked(): boolean {
    return this.filteredAnalysisItems.some(item => item.checked);
  }

  checkAll() {
    this.filteredAnalysisItems.forEach(item => {
      item.checked = this.allChecked;
    });
  }

  toggleChecked() {
    this.allChecked = this.filteredAnalysisItems.every(item => item.checked);
  }

  openModal() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  async bulkDelete() {
    this.cancelBulkDelete();
    this.loadingService.setLoadingMessage("Deleting Analysis Items...");
    this.loadingService.setLoadingStatus(true);
    let itemsToDelete: Array<IdbAccountAnalysisItem> = new Array();
    this.filteredAnalysisItems.forEach(item => {
      if (item.checked) {
        itemsToDelete.push(item);
      }
    });

    for (let index = 0; index < itemsToDelete.length; index++) {
      await this.confirmDelete(itemsToDelete[index], true);
    }

    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Analysis Items Deleted!", undefined, undefined, false, "alert-success");
    this.showDeleteColumn = false;
  }
}
