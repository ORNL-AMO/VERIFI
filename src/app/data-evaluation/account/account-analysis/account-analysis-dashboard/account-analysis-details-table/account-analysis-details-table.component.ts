import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import * as _ from 'lodash';

import { getYearsWithFullDataAccount } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFunctions';

interface AnalysisDetailsTableRow {
  analysisItem: IdbAccountAnalysisItem,
  isDeleteChecked: boolean,
  linkedReports: Array<string>,
  accountAnalysisStatusCheck: AccountAnalysisStatusCheck | undefined
}

@Component({
  selector: 'app-account-analysis-details-table',
  standalone: false,
  templateUrl: './account-analysis-details-table.component.html',
  styleUrl: './account-analysis-details-table.component.css'
})
export class AccountAnalysisDetailsTableComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly reportHandler = inject(ReportCommandHandler);
  private readonly accountHandler = inject(AccountCommandHandler);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private loadingService: LoadingService = inject(LoadingService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedAccount: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.accountAnalyses()]);
  accountReports: Signal<Array<IdbAccountReport>> = computed(() => [...this.accountWorkspaceStore.accountReports()]);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);
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
    if (yearOptionsEnergy && account.sustainabilityQuestions.energyReductionGoal && yearOptionsEnergy.length > 0 && account) {
      return yearOptionsEnergy[0] > account.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxEnergy: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsEnergy = this.yearOptionsEnergy();
    if (yearOptionsEnergy && account.sustainabilityQuestions.energyReductionGoal && yearOptionsEnergy.length > 0 && account) {
      return yearOptionsEnergy[yearOptionsEnergy.length - 1] < account.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMinWater: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && account.sustainabilityQuestions.waterReductionGoal && yearOptionsWater.length > 0 && account) {
      return yearOptionsWater[0] > account.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxWater: Signal<boolean> = computed(() => {
    const account = this.selectedAccount();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && account.sustainabilityQuestions.waterReductionGoal && yearOptionsWater.length > 0 && account) {
      return yearOptionsWater[yearOptionsWater.length - 1] < account.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
  });

  analysisItemsList: Signal<Array<AnalysisDetailsTableRow>> = computed(() => {
    const selectedAnalysisCategory = this.selectedAnalysisCategory();
    const accountReports = this.accountReports();
    const accountAnalysisItems = this.accountAnalysisItems();
    const accountStatusCheck = this.accountStatusCheck();
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

        const accountAnalysisStatusCheck = accountStatusCheck?.getAccountAnalysisStatusCheckById(analysisItem.guid);
        analysisItemsList.push({
          analysisItem: analysisItem,
          isDeleteChecked: false,
          linkedReports: linkedReports,
          accountAnalysisStatusCheck: accountAnalysisStatusCheck
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
      const updatedAccount = { ...selectedAccount };
      if (analysisItem.analysisCategory == 'energy') {
        (updatedAccount as any).selectedEnergyAnalysisId = analysisItem.guid;
      } else if (analysisItem.analysisCategory == 'water') {
        (updatedAccount as any).selectedWaterAnalysisId = analysisItem.guid;
      }
      const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
      await this.commandBoundary.execute(
        { entityKind: 'account', changeKind: 'update', entityGuid: updatedAccount.guid, label: 'Update Account' ,
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }},
        () => this.accountHandler.update(updatedAccount, activeAccountGuid)
      );
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

  selectAnalysisItem(analysisItem: IdbAccountAnalysisItem, accountAnalysisStatusCheck: AccountAnalysisStatusCheck | undefined) {
    this.accountWorkspaceService.selectAccountAnalysis((analysisItem)?.guid);
    const setupErrors = accountAnalysisStatusCheck?.accountAnalysisSetupErrors;
    if (setupErrors?.hasError || setupErrors?.facilitiesSelectionsInvalid) {
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
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountAnalysis', changeKind: 'delete', entityGuid: deletedItem.guid, label: 'Delete Account Analysis' },
      async () => {
        const deleted = await this.analysisHandler.deleteAccountAnalysis(deletedItem, activeAccountGuid);
        let accountReports: Array<IdbAccountReport> = [...this.accountWorkspaceStore.accountReports()];
        for (let i = 0; i < accountReports.length; i++) {
          if (accountReports[i].betterPlantsReportSetup.analysisItemId == deletedItem.guid) {
            await this.reportHandler.updateAccountReport({
              ...accountReports[i],
              betterPlantsReportSetup: { ...accountReports[i].betterPlantsReportSetup, analysisItemId: undefined }
            }, activeAccountGuid);
          }
        }
        if (deletedItem.guid == selectedAccount.selectedEnergyAnalysisId) {
          await this.accountHandler.update({ ...selectedAccount, selectedEnergyAnalysisId: undefined }, activeAccountGuid);
        } else if (deletedItem.guid == selectedAccount.selectedWaterAnalysisId) {
          await this.accountHandler.update({ ...selectedAccount, selectedWaterAnalysisId: undefined }, activeAccountGuid);
        }
        return deleted;
      }
    );
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
    this.accountWorkspaceService.selectAccountReport(itemGuid);
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');
  }

  goToSettings(){
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }
}
