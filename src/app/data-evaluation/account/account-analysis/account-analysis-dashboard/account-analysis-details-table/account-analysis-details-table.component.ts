import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { firstValueFrom } from 'rxjs';
import { getYearsWithFullDataAccount } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFunctions';

interface AnalysisDetailsTableRow {
  analysisItem: IdbAccountAnalysisItem,
  isDeleteChecked: boolean,
  linkedReports: Array<string>
}

@Component({
  selector: 'app-account-analysis-details-table',
  standalone: false,
  templateUrl: './account-analysis-details-table.component.html',
  styleUrl: './account-analysis-details-table.component.css'
})
export class AccountAnalysisDetailsTableComponent {
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private router: Router = inject(Router);
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private loadingService: LoadingService = inject(LoadingService);

  selectedAccount: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = toSignal(this.accountAnalysisDbService.accountAnalysisItems);
  accountReports: Signal<Array<IdbAccountReport>> = toSignal(this.accountReportDbService.accountReports);
  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);

  selectedAnalysisCategory: WritableSignal<'energy' | 'water' | 'all'> = signal('all');

  yearOptionsEnergy: Signal<Array<number>> = computed(() => {
    const account = this.selectedAccount();
    const calanderizedMeters = this.calanderizedMeters();
    if (account && calanderizedMeters) {
      let energyMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => getIsEnergyMeter(cMeter.meter.source));
      return getYearsWithFullDataAccount(energyMeters, account);
    }
    return [];
  });
  yearOptionsWater: Signal<Array<number>> = computed(() => {
    const account = this.selectedAccount();
    const calanderizedMeters = this.calanderizedMeters();
    if (account && calanderizedMeters) {
      let accountWaterMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => (cMeter.meter.source == 'Water Discharge' || cMeter.meter.source == 'Water Intake'));
      return getYearsWithFullDataAccount(accountWaterMeters, account);
    }
    return [];
  });
  baselineYearErrorMinEnergy: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsEnergy = this.yearOptionsEnergy();
    if (yearOptionsEnergy && yearOptionsEnergy.length > 0 && account) {
      return yearOptionsEnergy[0] > account.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxEnergy: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsEnergy = this.yearOptionsEnergy();
    if (yearOptionsEnergy && yearOptionsEnergy.length > 0 && account) {
      return yearOptionsEnergy[yearOptionsEnergy.length - 1] < account.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMinWater: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && yearOptionsWater.length > 0 && account) {
      return yearOptionsWater[0] > account.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxWater: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && yearOptionsWater.length > 0 && account) {
      return yearOptionsWater[yearOptionsWater.length - 1] < account.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
  });

  analysisItemsList: Signal<Array<AnalysisDetailsTableRow>> = computed(() => {
    const selectedAnalysisCategory = this.selectedAnalysisCategory();
    const accountReports = this.accountReports();
    const accountAnalysisItems = this.accountAnalysisItems();
    if (selectedAnalysisCategory && accountReports && accountAnalysisItems) {
      let analysisItemsList: Array<AnalysisDetailsTableRow> = [];
      let filteredAnalysisItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => selectedAnalysisCategory == 'all' || item.analysisCategory == selectedAnalysisCategory);

      filteredAnalysisItems.forEach(analysisItem => {
        let linkedReports: Array<string> = accountReports.filter(report => {
          return (report.reportType == 'betterPlants' && report.betterPlantsReportSetup.analysisItemId == analysisItem.guid) ||
            (report.reportType == 'performance' && report.performanceReportSetup.analysisItemId == analysisItem.guid) ||
            (report.reportType == 'accountSavings' && report.accountSavingsReportSetup.analysisItemId == analysisItem.guid) ||
            (report.reportType == 'analysis' && report.analysisReportSetup.analysisItemId == analysisItem.guid);
        }).map(report => report.guid);

        analysisItemsList.push({
          analysisItem: analysisItem,
          isDeleteChecked: false,
          linkedReports: linkedReports
        });
      });
      return analysisItemsList;
    }
    return [];
  });

  orderDataField: WritableSignal<'name' | 'modifiedDate' | 'baselineYear'> = signal('name');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');

  orderedAnalysisItems: Signal<Array<AnalysisDetailsTableRow>> = computed(() => {
    const analysisItemsList = this.analysisItemsList();
    const orderDataField = this.orderDataField();
    const orderByDirection = this.orderByDirection();
    if (analysisItemsList && orderDataField && orderByDirection) {
      return _.orderBy(analysisItemsList, (item: AnalysisDetailsTableRow) => {
        return item.analysisItem[orderDataField];
      }, [orderByDirection]);
    }
    return analysisItemsList;
  });


  checkedGuids: WritableSignal<Set<string>> = signal(new Set<string>());

  checkedItems: Signal<Array<AnalysisDetailsTableRow>> = computed(() => {
    const orderedAnalysisItems = this.orderedAnalysisItems();
    const checkedGuids = this.checkedGuids();
    if (orderedAnalysisItems) {
      return orderedAnalysisItems.filter(item => checkedGuids.has(item.analysisItem.guid));
    }
    return [];
  });

  hasCheckedItems: Signal<boolean> = computed(() => {
    return this.checkedGuids().size > 0;
  });


  displayDeleteModal: boolean = false;
  itemToDelete: IdbAccountAnalysisItem;
  currentPageNumber: number = 1;

  showDeleteColumn: boolean = false;
  allChecked: boolean = false;
  showBulkDelete: boolean = false;
  displayLinkedItemModal: boolean = false;
  viewLinkedItem: string;


  setOrderDataField(str: 'name' | 'modifiedDate' | 'baselineYear') {
    if (str == this.orderDataField()) {
      if (this.orderByDirection() == 'desc') {
        this.orderByDirection.set('asc');
      } else {
        this.orderByDirection.set('desc');
      }
    } else {
      this.orderDataField.set(str);
    }
  }

  async setUseItem(analysisItem: IdbAccountAnalysisItem) {
    let selectedAccount = this.selectedAccount();
    let canSelectItem: boolean = this.getCanSelectItem(selectedAccount, analysisItem);
    if (canSelectItem) {
      if (analysisItem.analysisCategory == 'energy') {
        selectedAccount.selectedEnergyAnalysisId = analysisItem.guid;
      } else if (analysisItem.analysisCategory == 'water') {
        selectedAccount.selectedWaterAnalysisId = analysisItem.guid;
      }
      await this.dbChangesService.updateAccount(selectedAccount);
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
    let selectedAccount = this.selectedAccount();
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
    if (deletedItem.guid == selectedAccount.selectedEnergyAnalysisId) {
      selectedAccount.selectedEnergyAnalysisId = undefined;
      await this.dbChangesService.updateAccount(selectedAccount);
    } else if (deletedItem.guid == selectedAccount.selectedWaterAnalysisId) {
      selectedAccount.selectedWaterAnalysisId = undefined;
      await this.dbChangesService.updateAccount(selectedAccount);
    }
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount, false);
    if (!isBulkDelete) {
      this.displayDeleteModal = false;
      this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
    }
  }

  toggleBulkDelete() {
    this.showDeleteColumn = !this.showDeleteColumn;
    if (!this.showDeleteColumn) {
      this.checkedGuids.set(new Set<string>());
      this.allChecked = false;
    }
  }

  toggleCheck(guid: string, checked: boolean) {
    this.checkedGuids.update(set => {
      const next = new Set(set);
      checked ? next.add(guid) : next.delete(guid);
      return next;
    });
  }

  checkAll() {
    if (this.allChecked) {
      this.checkedGuids.set(new Set(this.orderedAnalysisItems().map(i => i.analysisItem.guid)));
    } else {
      this.checkedGuids.set(new Set<string>());
    }
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
    let itemsToDelete: Array<IdbAccountAnalysisItem> = this.checkedItems().map(item => item.analysisItem);
    for (let index = 0; index < itemsToDelete.length; index++) {
      await this.confirmDelete(itemsToDelete[index], true);
    }

    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Analysis Items Deleted!", undefined, undefined, false, "alert-success");
    this.showDeleteColumn = false;
  }

  openLinkedItemModal(itemGuid: string) {
    this.displayLinkedItemModal = true;
    this.viewLinkedItem = itemGuid;
  }

  cancelViewLinkedItem() {
    this.displayLinkedItemModal = false;
  }

  confirmViewLinkedItem(itemGuid: string) {
    let report: IdbAccountReport = this.accountReportDbService.getByGuid(itemGuid);
    this.accountReportDbService.selectedReport.next(report);
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');
  }

  goToSettings(){
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }
}
