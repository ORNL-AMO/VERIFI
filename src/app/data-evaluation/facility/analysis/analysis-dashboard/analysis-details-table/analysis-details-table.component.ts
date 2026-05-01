import { Component, computed, inject, Input, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, getNewIdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFunctions';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import * as _ from 'lodash';

interface AnalysisDetailsTableRow {
  analysisItem: IdbAnalysisItem,
  isDeleteChecked: boolean,
  linkedItems: Array<{
    guid: string,
    type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport'
  }>
}

@Component({
  selector: 'app-analysis-details-table',
  standalone: false,
  templateUrl: './analysis-details-table.component.html',
  styleUrl: './analysis-details-table.component.css'
})

export class AnalysisDetailsTableComponent {
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private router: Router = inject(Router);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private facilityReportsDbService: FacilityReportsDbService = inject(FacilityReportsDbService);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private calendarizationService: CalanderizationService = inject(CalanderizationService);
  private loadingService: LoadingService = inject(LoadingService);


  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calendarizationService.calanderizedMeters);
  facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = toSignal(this.accountAnalysisDbService.accountAnalysisItems);
  facilityReports: Signal<Array<IdbFacilityReport>> = toSignal(this.facilityReportsDbService.facilityReports);

  selectedAnalysisCategory: WritableSignal<'energy' | 'water' | 'all'> = signal('all');

  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);
  yearOptionsEnergy: Signal<Array<number>> = computed(() => {
    const facility = this.selectedFacility();
    const calanderizedMeters = this.calanderizedMeters();
    if (facility && calanderizedMeters) {
      let facilityEnergyMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => cMeter.meter.facilityId == facility.guid && getIsEnergyMeter(cMeter.meter.source));
      return getYearsWithFullData(facilityEnergyMeters, facility);
    }
    return [];
  });
  yearOptionsWater: Signal<Array<number>> = computed(() => {
    const facility = this.selectedFacility();
    const calanderizedMeters = this.calanderizedMeters();
    if (facility && calanderizedMeters) {
      let facilityWaterMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => cMeter.meter.facilityId == facility.guid && (cMeter.meter.source == 'Water Discharge' || cMeter.meter.source == 'Water Intake'));
      return getYearsWithFullData(facilityWaterMeters, facility);
    }
    return [];
  });

  analysisItemsList: Signal<Array<AnalysisDetailsTableRow>> = computed(() => {
    const selectedAnalysisCategory = this.selectedAnalysisCategory();
    const facilityAnalysisItems = this.facilityAnalysisItems();
    const accountAnalysisItems = this.accountAnalysisItems();
    const facilityReports = this.facilityReports();
    if (selectedAnalysisCategory && facilityAnalysisItems && accountAnalysisItems && facilityReports) {
      let analysisItemsList: Array<AnalysisDetailsTableRow> = [];
      let filteredAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => selectedAnalysisCategory == 'all' || item.analysisCategory == selectedAnalysisCategory);

      filteredAnalysisItems.forEach(analysisItem => {
        let linkedItems: Array<{
          guid: string,
          type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport'
        }> = new Array();
        if (analysisItem.hasBanking && analysisItem.bankedAnalysisItemId) {
          linkedItems.push({
            guid: analysisItem.bankedAnalysisItemId,
            type: 'bankedAnalysis'
          });
        }

        let facilityReportsItems: Array<IdbFacilityReport> = facilityReports.filter(report => report.analysisItemId == analysisItem.guid);
        facilityReportsItems.forEach(item => {
          linkedItems.push({
            guid: item.guid,
            type: 'facilityReport'
          });
        });

        let accountAnalysisItemsWithLink: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(accountItem => accountItem.facilityAnalysisItems.some(facilityItem => facilityItem.analysisItemId == analysisItem.guid));
        accountAnalysisItemsWithLink.forEach(item => {
          linkedItems.push({
            guid: item.guid,
            type: 'accountAnalysis'
          });
        });

        analysisItemsList.push({
          analysisItem: analysisItem,
          isDeleteChecked: false,
          linkedItems: linkedItems
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

  baselineYearErrorMinEnergy: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsEnergy = this.yearOptionsEnergy();
    if (yearOptionsEnergy && yearOptionsEnergy.length > 0 && selectedFacility) {
      return yearOptionsEnergy[0] > selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxEnergy: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsEnergy = this.yearOptionsEnergy();
    if (yearOptionsEnergy && yearOptionsEnergy.length > 0 && selectedFacility) {
      return yearOptionsEnergy[yearOptionsEnergy.length - 1] < selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMinWater: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && yearOptionsWater.length > 0 && selectedFacility) {
      return yearOptionsWater[0] > selectedFacility.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxWater: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && yearOptionsWater.length > 0 && selectedFacility) {
      return yearOptionsWater[yearOptionsWater.length - 1] < selectedFacility.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
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

  currentPageNumber: number = 1;
  displayDeleteModal: boolean = false;
  displayCreateCopyModal: boolean = false;
  displayCreateReportModal: boolean = false;
  displayAnalysisDetailsModal: boolean = false;
  analysisItemToDelete: AnalysisDetailsTableRow;
  analysisItemToCopy: IdbAnalysisItem;
  analysisItemToCreateReport: IdbAnalysisItem;
  analysisItemToView: IdbAnalysisItem;

  displayLinkedItemModal: boolean = false;
  viewLinkedItem: { itemId: string, type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport' } = undefined;

  showDeleteColumn: boolean = false;
  allChecked: boolean = false;
  showBulkDelete: boolean = false;

  selectAnalysisItem(analysisItem: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/analysis/run-analysis');
  }

  async setUseItem(analysisItem: IdbAnalysisItem) {
    const selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    const selectedFacility: IdbFacility = this.selectedFacility();
    const canSelectItem: boolean = this.getCanSelectItem(selectedAccount, selectedFacility, analysisItem);
    if (canSelectItem) {

      if (analysisItem.analysisCategory == 'energy') {
        selectedFacility.selectedEnergyAnalysisId = analysisItem.guid;
      } else if (analysisItem.analysisCategory == 'water') {
        selectedFacility.selectedWaterAnalysisId = analysisItem.guid;
      }
      await firstValueFrom(this.facilityDbService.updateWithObservable(selectedFacility));
    } else {
      this.toastNotificationService.showToast('Analysis Item Cannot Be Selected', "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility energy goal.", 10000, false, 'alert-danger');
    }
  }

  getCanSelectItem(account: IdbAccount, facility: IdbFacility, analysisItem: IdbAnalysisItem): boolean {
    if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.energyReductionBaselineYear) {
        if (facility.isNewFacility && analysisItem.baselineYear > account.sustainabilityQuestions.energyReductionBaselineYear) {
          return true;
        } else {
          return false
        }
      } else {
        return true;
      }
    } else if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.waterReductionBaselineYear) {
        if (facility.isNewFacility && analysisItem.baselineYear > account.sustainabilityQuestions.waterReductionBaselineYear) {
          return true;
        } else {
          return false
        }
      } else {
        return true;
      }
    }
  }

  addReport(analysisItem: IdbAnalysisItem) {
    this.displayCreateReportModal = true;
    this.analysisItemToCreateReport = analysisItem;
  }

  cancelCreateReport() {
    this.displayCreateReportModal = false;
  }

  async confirmCreateReport(analysisItem: IdbAnalysisItem) {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(analysisItem.facilityId);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(analysisItem.facilityId, analysisItem.accountId, 'analysis', groups);
    newReport.analysisItemId = analysisItem.guid;
    newReport = await firstValueFrom(this.facilityReportsDbService.addWithObservable(newReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, this.selectedFacility());
    this.toastNotificationService.showToast('Report Created!', 'Analysis report has been created', undefined, false, 'alert-success');
    this.goToReport(newReport.guid);
  }

  goToReport(reportGuid: string) {
    let facilityReport: IdbFacilityReport = this.facilityReportsDbService.getByGuid(reportGuid);
    this.facilityReportsDbService.selectedReport.next(facilityReport);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/reports/setup')
  }

  createCopy(analysisItem: IdbAnalysisItem) {
    this.displayCreateCopyModal = true;
    this.analysisItemToCopy = analysisItem;
  }

  cancelCreateCopy() {
    this.displayCreateCopyModal = false;
  }

  async confirmCreateCopy(analysisItem: IdbAnalysisItem) {
    let newItem: IdbAnalysisItem = JSON.parse(JSON.stringify(analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + " (Copy)";
    newItem.guid = Math.random().toString(36).substr(2, 9);
    let addedItem: IdbAnalysisItem = await firstValueFrom(this.analysisDbService.addWithObservable(newItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility());
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/analysis/run-analysis');
  }

  deleteItem(analysisDetailsTableRow: AnalysisDetailsTableRow) {
    this.displayDeleteModal = true;
    this.analysisItemToDelete = analysisDetailsTableRow;
  }

  async confirmDelete(analysisDetailsTableRow: AnalysisDetailsTableRow, isBulkDelete: boolean = false) {
    await firstValueFrom(this.analysisDbService.deleteWithObservable(analysisDetailsTableRow.analysisItem.id));
    //update account analysis items
    const selectedFacility: IdbFacility = this.selectedFacility();
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      let updated: boolean = false;
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == selectedFacility.guid && item.analysisItemId == analysisDetailsTableRow.analysisItem.guid) {
          item.analysisItemId = undefined;
          updated = true;
        }
      });
      if (updated) {
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
      }
    }
    if (selectedFacility.selectedEnergyAnalysisId == analysisDetailsTableRow.analysisItem.guid) {
      selectedFacility.selectedEnergyAnalysisId = undefined;
      await firstValueFrom(this.facilityDbService.updateWithObservable(selectedFacility));
    } else if (selectedFacility.selectedWaterAnalysisId == analysisDetailsTableRow.analysisItem.guid) {
      selectedFacility.selectedWaterAnalysisId = undefined;
      await firstValueFrom(this.facilityDbService.updateWithObservable(selectedFacility));
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount, false)
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, selectedFacility);
    if (!isBulkDelete) {
      this.displayDeleteModal = false;
      this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
    }
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

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

  viewAnalysisDetails(analysisItem: IdbAnalysisItem) {
    this.analysisItemToView = analysisItem;
    this.displayAnalysisDetailsModal = true;
  }

  closeAnalysisDetails() {
    this.displayAnalysisDetailsModal = false;
  }

  openLinkedItemModal(itemGuid: string, type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport') {
    this.viewLinkedItem = { itemId: itemGuid, type: type };
    this.displayLinkedItemModal = true;
  }

  cancelViewLinkedItem() {
    this.displayLinkedItemModal = false;
    this.viewLinkedItem = undefined;
  }

  confirmViewLinkedItem() {
    if (this.viewLinkedItem.type == 'accountAnalysis') {
      this.goToAccountAnalysis(this.viewLinkedItem.itemId);
    } else if (this.viewLinkedItem.type == 'bankedAnalysis') {
      this.goToFacilityAnalysis(this.viewLinkedItem.itemId);
    } else if (this.viewLinkedItem.type == 'facilityReport') {
      this.goToReport(this.viewLinkedItem.itemId);
    }
  }

  goToAccountAnalysis(analysisGuid: string) {
    let accountAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getByGuid(analysisGuid);
    this.accountAnalysisDbService.selectedAnalysisItem.next(accountAnalysisItem);
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
  }

  goToFacilityAnalysis(analysisGuid: string) {
    let bankedAnalysisItem: IdbAnalysisItem = this.analysisDbService.getByGuid(analysisGuid);
    this.analysisDbService.selectedAnalysisItem.next(bankedAnalysisItem);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/analysis/run-analysis');
  }

  goToSettings() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/settings');
  }

  goToUtilityData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/utility');
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
    let itemsToDelete: Array<AnalysisDetailsTableRow> = this.checkedItems();

    for (let index = 0; index < itemsToDelete.length; index++) {
      await this.confirmDelete(itemsToDelete[index], true);
    }

    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Analysis Items Deleted!", undefined, undefined, false, "alert-success");
    this.showDeleteColumn = false;
  }
}

