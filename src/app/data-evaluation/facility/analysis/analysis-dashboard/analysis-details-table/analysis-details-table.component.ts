import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
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
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';

interface AnalysisDetailsTableRow {
  analysisItem: IdbAnalysisItem,
  isDeleteChecked: boolean,
  linkedItems: Array<{
    guid: string,
    type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport'
  }>
  analysisStatusCheck: AnalysisStatusCheck
}

@Component({
  selector: 'app-analysis-details-table',
  standalone: false,
  templateUrl: './analysis-details-table.component.html',
  styleUrl: './analysis-details-table.component.css'
})

export class AnalysisDetailsTableComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly reportHandler = inject(ReportCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private calendarizationService: CalanderizationService = inject(CalanderizationService);
  private loadingService: LoadingService = inject(LoadingService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);


  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calendarizationService.calanderizedMeters);
  facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...[...this.accountWorkspaceStore.selectedFacilityAnalyses()]]);
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.accountAnalyses()]);
  facilityReports: Signal<Array<IdbFacilityReport>> = computed(() => [...[...this.accountWorkspaceStore.selectedFacilityReports()]]);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

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
    const facilityStatusCheck = this.facilityStatusCheck();
    if (selectedAnalysisCategory && facilityAnalysisItems && accountAnalysisItems && facilityReports && facilityStatusCheck) {
      let analysisItemsList: Array<AnalysisDetailsTableRow> = [];
      let filteredAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => selectedAnalysisCategory == 'all' || item.analysisCategory == selectedAnalysisCategory);
      filteredAnalysisItems.forEach(analysisItem => {
        const analysisStatusCheck: AnalysisStatusCheck = facilityStatusCheck.analysisStatusChecks.find(check => check.analysisItem.guid == analysisItem.guid);

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
          linkedItems: linkedItems,
          analysisStatusCheck: analysisStatusCheck
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
    if (yearOptionsEnergy && selectedFacility.sustainabilityQuestions.energyReductionGoal && yearOptionsEnergy.length > 0 && selectedFacility) {
      return yearOptionsEnergy[0] > selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxEnergy: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsEnergy = this.yearOptionsEnergy();
    if (yearOptionsEnergy && selectedFacility.sustainabilityQuestions.energyReductionGoal && yearOptionsEnergy.length > 0 && selectedFacility) {
      return yearOptionsEnergy[yearOptionsEnergy.length - 1] < selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMinWater: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && selectedFacility.sustainabilityQuestions.waterReductionGoal && yearOptionsWater.length > 0 && selectedFacility) {
      return yearOptionsWater[0] > selectedFacility.sustainabilityQuestions.waterReductionBaselineYear;
    }
    return false;
  });
  baselineYearErrorMaxWater: Signal<boolean> = computed(() => {
    const selectedFacility = this.selectedFacility();
    const yearOptionsWater = this.yearOptionsWater();
    if (yearOptionsWater && selectedFacility.sustainabilityQuestions.waterReductionGoal && yearOptionsWater.length > 0 && selectedFacility) {
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
    this.accountWorkspaceService.selectFacilityAnalysis((analysisItem)?.guid);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/analysis/run-analysis');
  }

  async setUseItem(analysisItem: IdbAnalysisItem) {
    const selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    const selectedFacility: IdbFacility = this.selectedFacility();
    const canSelectItem: boolean = this.getCanSelectItem(selectedAccount, selectedFacility, analysisItem);
    if (canSelectItem) {

      const updatedFacility: IdbFacility = { ...selectedFacility };
      if (analysisItem.analysisCategory == 'energy') {
        (updatedFacility as any).selectedEnergyAnalysisId = analysisItem.guid;
      } else if (analysisItem.analysisCategory == 'water') {
        (updatedFacility as any).selectedWaterAnalysisId = analysisItem.guid;
      }
      const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
      await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'update', entityGuid: updatedFacility.guid, label: 'Update Facility' ,
          publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilities', upsert: [value] }] }) }},
        () => this.facilityHandler.update(updatedFacility, activeAccountGuid)
      );
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
    let groups: Array<IdbUtilityMeterGroup> = this.accountWorkspaceQuery.getFacilityMeterGroups(analysisItem.facilityId);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(analysisItem.facilityId, analysisItem.accountId, 'analysis', groups);
    newReport.analysisItemId = analysisItem.guid;
    const { value: addedReport } = await this.commandBoundary.execute(
      { entityKind: 'facilityReport', changeKind: 'add', label: 'Create Facility Report' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityReports', upsert: [value] }] }) }},
      () => this.reportHandler.addFacilityReport(newReport, this.accountWorkspaceStore.account()?.guid)
    );
    this.toastNotificationService.showToast('Report Created!', 'Analysis report has been created', undefined, false, 'alert-success');
    this.goToReport(newReport.guid);
  }

  goToReport(reportGuid: string) {
    this.accountWorkspaceService.selectFacilityReport(reportGuid);
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
    const { value: addedItem } = await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'add', label: 'Create Facility Analysis' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) }},
      () => this.analysisHandler.addFacilityAnalysis(newItem, this.accountWorkspaceStore.account()?.guid)
    );
    this.accountWorkspaceService.selectFacilityAnalysis((addedItem)?.guid);
    this.toastNotificationService.showToast('Analysis Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/analysis/run-analysis');
  }

  deleteItem(analysisDetailsTableRow: AnalysisDetailsTableRow) {
    this.displayDeleteModal = true;
    this.analysisItemToDelete = analysisDetailsTableRow;
  }

  async confirmDelete(analysisDetailsTableRow: AnalysisDetailsTableRow, isBulkDelete: boolean = false) {
    const selectedFacility: IdbFacility = this.selectedFacility();
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'delete', entityGuid: analysisDetailsTableRow.analysisItem.guid, label: 'Delete Facility Analysis' },
      async () => {
        const deleted = await this.analysisHandler.deleteFacilityAnalysis(analysisDetailsTableRow.analysisItem, activeAccountGuid);
        const accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisItems();
        for (let index = 0; index < accountAnalysisItems.length; index++) {
          let updated: boolean = false;
          const updatedItem = { ...accountAnalysisItems[index], facilityAnalysisItems: accountAnalysisItems[index].facilityAnalysisItems.map(item => {
            if (item.facilityId == selectedFacility.guid && item.analysisItemId == analysisDetailsTableRow.analysisItem.guid) {
              updated = true;
              return { ...item, analysisItemId: undefined };
            }
            return { ...item };
          }) };
          if (updated) {
            await this.analysisHandler.updateAccountAnalysis(updatedItem, activeAccountGuid);
          }
        }
        if (selectedFacility.selectedEnergyAnalysisId == analysisDetailsTableRow.analysisItem.guid) {
          await this.facilityHandler.update({ ...selectedFacility, selectedEnergyAnalysisId: undefined }, activeAccountGuid);
        } else if (selectedFacility.selectedWaterAnalysisId == analysisDetailsTableRow.analysisItem.guid) {
          await this.facilityHandler.update({ ...selectedFacility, selectedWaterAnalysisId: undefined }, activeAccountGuid);
        }
        return deleted;
      }
    );
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
    this.accountWorkspaceService.selectAccountAnalysis(analysisGuid);
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
  }

  goToFacilityAnalysis(analysisGuid: string) {
    this.accountWorkspaceService.selectFacilityAnalysis(analysisGuid);
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
    this.toggleBulkDelete();
  }
}
