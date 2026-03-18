import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
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
import { AnalysisGroupItem } from '../../analysis.service';

@Component({
  selector: 'app-analysis-details-table',
  standalone: false,

  templateUrl: './analysis-details-table.component.html',
  styleUrl: './analysis-details-table.component.css'
})
export class AnalysisDetailsTableComponent {
  @Input()
  selectedFacility: IdbFacility;

  displayDeleteModal: boolean = false;
  displayCreateCopyModal: boolean = false;
  displayCreateReportModal: boolean = false;
  displayAnalysisDetailsModal: boolean = false;
  analysisItemToDelete: IdbAnalysisItem;
  analysisItemToCopy: IdbAnalysisItem;
  analysisItemToCreateReport: IdbAnalysisItem;
  analysisItemToView: IdbAnalysisItem;
  orderDataField: string = 'analysisItem.name';
  orderByDirection: 'asc' | 'desc' = 'desc';
  selectedAnalysisCategory: 'energy' | 'water' | 'all' = 'all';
  facilityAnalysisItems: Array<IdbAnalysisItem>;
  filteredAnalysisItems: Array<IdbAnalysisItem>;
  yearOptionsEnergy: Array<number>;
  yearOptionsWater: Array<number>;
  selectedYearCategoryMap: { [year: number]: { [category: string]: boolean } } = {};
  errorList: Array<{ year: number, category: string }> = [];

  linkedItems: Array<{
    guid: string,
    type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport'
  }>;

  linkedItemsList: Array<{
    analysisItem: IdbAnalysisItem, linkedItems: Array<{
      // bankedAnalysisId: string,
      // reportId: string,
      // accountAnalysisId: string
      guid: string,
      type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport'
    }>
  }> = [];
  isBanked: boolean;

  displayLinkedItemModal: boolean = false;
  viewLinkedItem: { itemId: string, type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport' } = undefined;
  groupItems: Array<AnalysisGroupItem>;
  baselineYearErrorMinEnergy: boolean;
  baselineYearErrorMaxEnergy: boolean;
  baselineYearErrorMinWater: boolean;
  baselineYearErrorMaxWater: boolean;
  selectedFacilitySub: Subscription;

  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;

  constructor(private analysisDbService: AnalysisDbService, private router: Router,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService,
    private calendarizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.yearOptionsEnergy = this.calendarizationService.getYearOptions('energy', true, this.selectedFacility.guid);
      this.yearOptionsWater = this.calendarizationService.getYearOptions('water', true, this.selectedFacility.guid);
     
      if (this.yearOptionsEnergy) {
        this.baselineYearErrorMinEnergy = this.yearOptionsEnergy[0] > this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
        this.baselineYearErrorMaxEnergy = this.yearOptionsEnergy[this.yearOptionsEnergy.length - 1] < this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
      }

      if (this.yearOptionsWater) {
        this.baselineYearErrorMinWater = this.yearOptionsWater[0] > this.selectedFacility.sustainabilityQuestions.waterReductionBaselineYear;
        this.baselineYearErrorMaxWater = this.yearOptionsWater[this.yearOptionsWater.length - 1] < this.selectedFacility.sustainabilityQuestions.waterReductionBaselineYear;
      }

      this.facilityAnalysisItems = this.analysisDbService.facilityAnalysisItems.getValue();
      this.filteredAnalysisItems = this.facilityAnalysisItems;
      this.selectedAnalysisCategory = 'all';
      this.filterAnalysisItems();
      this.setLinkedItems();
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  selectAnalysisItem(analysisItem: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    if (analysisItem.setupErrors.hasError || analysisItem.setupErrors.groupsHaveErrors) {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis/facility-analysis');
    }
  }

  async setUseItem(analysisItem: IdbAnalysisItem) {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let canSelectItem: boolean = this.getCanSelectItem(selectedAccount, this.selectedFacility, analysisItem);
    if (canSelectItem) {

      if (analysisItem.analysisCategory == 'energy') {
        this.selectedFacility.selectedEnergyAnalysisId = analysisItem.guid;
      } else if (analysisItem.analysisCategory == 'water') {
        this.selectedFacility.selectedWaterAnalysisId = analysisItem.guid;
      }
      await firstValueFrom(this.facilityDbService.updateWithObservable(this.selectedFacility));
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

  filterAnalysisItems() {
    this.filteredAnalysisItems = this.facilityAnalysisItems
      .filter(item => {
        const categoryMatch = this.selectedAnalysisCategory === 'all' || item.analysisCategory === this.selectedAnalysisCategory;
        return categoryMatch;
      });

    this.setLinkedItems();
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
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, this.selectedFacility);
    this.toastNotificationService.showToast('Report Created!', 'Analysis report has been created', undefined, false, 'alert-success');
    this.goToReport(newReport.guid);
  }

  goToReport(reportGuid: string) {
    let facilityReport: IdbFacilityReport = this.facilityReportsDbService.getByGuid(reportGuid);
    this.facilityReportsDbService.selectedReport.next(facilityReport);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/reports/setup')
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
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis');
  }

  deleteItem(analysisItem: IdbAnalysisItem) {
    this.displayDeleteModal = true;
    this.analysisItemToDelete = analysisItem;
  }

  async confirmDelete(analysisItem: IdbAnalysisItem) {
    await firstValueFrom(this.analysisDbService.deleteWithObservable(analysisItem.id));
    //update account analysis items
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      let updated: boolean = false;
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == analysisItem.guid) {
          item.analysisItemId = undefined;
          updated = true;
        }
      });
      if (updated) {
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
      }
    }
    if (this.selectedFacility.selectedEnergyAnalysisId == analysisItem.guid) {
      this.selectedFacility.selectedEnergyAnalysisId = undefined;
      await firstValueFrom(this.facilityDbService.updateWithObservable(this.selectedFacility));
    } else if (this.selectedFacility.selectedWaterAnalysisId == analysisItem.guid) {
      this.selectedFacility.selectedWaterAnalysisId = undefined;
      await firstValueFrom(this.facilityDbService.updateWithObservable(this.selectedFacility));
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount, false)
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
    this.facilityAnalysisItems = this.analysisDbService.facilityAnalysisItems.getValue();
    this.filteredAnalysisItems = this.facilityAnalysisItems;
    this.selectedAnalysisCategory = 'all';
    this.setLinkedItems();
  }

  cancelDelete() {
    this.displayDeleteModal = false;
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

  viewAnalysisDetails(analysisItem: IdbAnalysisItem) {
    this.analysisItemToView = analysisItem;
    this.displayAnalysisDetailsModal = true;
  }

  closeAnalysisDetails() {
    this.displayAnalysisDetailsModal = false;
  }

  setLinkedItems() {
    this.linkedItemsList = [];
    this.filteredAnalysisItems.forEach(analysisItem => {
      this.linkedItems = new Array();
      if (analysisItem.hasBanking && analysisItem.bankedAnalysisItemId) {
        this.linkedItems.push({
          guid: analysisItem.bankedAnalysisItemId,
          type: 'bankedAnalysis'
        });
      }

      this.isBanked = false;
      let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
      facilityAnalysisItems.forEach(item => {
        if (item.hasBanking && item.bankedAnalysisItemId == analysisItem.guid) {
          this.isBanked = true;
        }
      });

      let facilityReportsItems: Array<IdbFacilityReport> = this.facilityReportsDbService.facilityReports.getValue();
      facilityReportsItems.forEach(item => {
        if (item.facilityReportType == 'analysis' && item.analysisItemId == analysisItem.guid) {
          this.linkedItems.push({
            guid: item.guid,
            type: 'facilityReport'
          });
        }
      });

      let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
      for (let index = 0; index < accountAnalysisItems.length; index++) {
        accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
          if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == analysisItem.guid) {
            this.linkedItems.push({
              guid: accountAnalysisItems[index].guid,
              type: 'accountAnalysis'
            })
          }
        });
      }
      this.linkedItemsList.push({ analysisItem: analysisItem, linkedItems: this.linkedItems });
    });
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
    if (accountAnalysisItem.setupErrors.hasError || accountAnalysisItem.setupErrors.facilitiesSelectionsInvalid) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
    } else {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results');
    }
  }

  goToFacilityAnalysis(analysisGuid: string) {
    let bankedAnalysisItem: IdbAnalysisItem = this.analysisDbService.getByGuid(analysisGuid);
    this.analysisDbService.selectedAnalysisItem.next(bankedAnalysisItem);
    if (bankedAnalysisItem.setupErrors.hasError || bankedAnalysisItem.setupErrors.groupsHaveErrors) {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/analysis/run-analysis/facility-analysis');
    }
  }

  goToSettings() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/settings');
  }

  goToUtilityData() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/utility');
  }
}
