import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroupItem, AnalysisService } from '../../analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

@Component({
    selector: 'app-analysis-item-card',
    templateUrl: './analysis-item-card.component.html',
    styleUrls: ['./analysis-item-card.component.css'],
    standalone: false
})
export class AnalysisItemCardComponent implements OnInit {
  @Input()
  analysisItem: IdbAnalysisItem;

  groupItems: Array<AnalysisGroupItem>;


  linkedItems: Array<{
    bankedAnalysisId: string,
    reportId: string,
    accountAnalysisId: string
  }>;

  showDetailSub: Subscription;
  showDetail: boolean;
  displayDeleteModal: boolean = false;
  displayCreateCopyModal: boolean = false;
  selectedFacility: IdbFacility;

  displayLinkedItemModal: boolean = false;
  viewLinkedItem: { itemId: string, type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport' } = undefined;

  displayCreateReportModal: boolean = false;
  isBanked: boolean;
  constructor(private analysisDbService: AnalysisDbService, private router: Router, private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.initializeGroups();
    this.showDetailSub = this.analysisService.showDetail.subscribe(val => {
      this.showDetail = val;
    });
    this.setLinkedItems();
  }

  ngOnDestroy() {
    this.showDetailSub.unsubscribe();
  }

  initializeGroups() {
    this.groupItems = this.analysisItem.groups.map(group => {
      return this.analysisService.getGroupItem(group);
    }).filter(item => {
      return item.group.analysisType != 'skip';
    });
  }

  selectAnalysisItem() {
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
    if (this.analysisItem.setupErrors.hasError || this.analysisItem.setupErrors.groupsHaveErrors) {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
    } else {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis/facility-analysis');
    }
  }

  createCopy() {
    this.displayCreateCopyModal = true;
  }

  cancelCreateCopy() {
    this.displayCreateCopyModal = false;
  }

  async confirmCreateCopy() {
    let newItem: IdbAnalysisItem = JSON.parse(JSON.stringify(this.analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + " (Copy)";
    newItem.guid = Math.random().toString(36).substr(2, 9);
    newItem.selectedYearAnalysis = false;
    let addedItem: IdbAnalysisItem = await firstValueFrom(this.analysisDbService.addWithObservable(newItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }

  deleteItem() {
    this.displayDeleteModal = true;
  }

  async confirmDelete() {
    await firstValueFrom(this.analysisDbService.deleteWithObservable(this.analysisItem.id));
    //update account analysis items
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      let updated: boolean = false;
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == this.analysisItem.guid) {
          item.analysisItemId = undefined;
          updated = true;
        }
      });
      if (updated) {
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
      }
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount, false)
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }


  async setUseItem() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let canSelectItem: boolean = this.getCanSelectItem(selectedAccount, this.selectedFacility, this.analysisItem);
    if (canSelectItem) {
      let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
      let categoryAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.analysisCategory == this.analysisItem.analysisCategory });
      for (let i = 0; i < categoryAnalysisItems.length; i++) {
        if (categoryAnalysisItems[i].guid == this.analysisItem.guid) {
          if (categoryAnalysisItems[i].selectedYearAnalysis) {
            categoryAnalysisItems[i].selectedYearAnalysis = false;
          } else {
            categoryAnalysisItems[i].selectedYearAnalysis = true;
          }
          await firstValueFrom(this.analysisDbService.updateWithObservable(categoryAnalysisItems[i]));
        } else if (categoryAnalysisItems[i].reportYear == this.analysisItem.reportYear && categoryAnalysisItems[i].selectedYearAnalysis) {
          categoryAnalysisItems[i].selectedYearAnalysis = false;
          await firstValueFrom(this.analysisDbService.updateWithObservable(categoryAnalysisItems[i]));
        }
      }
      await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
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

  setLinkedItems() {
    this.linkedItems = new Array();
    if (this.analysisItem.hasBanking && this.analysisItem.bankedAnalysisItemId) {
      this.linkedItems.push({
        bankedAnalysisId: this.analysisItem.bankedAnalysisItemId,
        reportId: undefined,
        accountAnalysisId: undefined
      });
    }

    this.isBanked = false;
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    facilityAnalysisItems.forEach(item => {
      if (item.hasBanking && item.bankedAnalysisItemId == this.analysisItem.guid) {
        this.isBanked = true;
      }
    });

    let facilityReportsItems: Array<IdbFacilityReport> = this.facilityReportsDbService.facilityReports.getValue();
    facilityReportsItems.forEach(item => {
      if (item.facilityReportType == 'analysis' && item.analysisItemId == this.analysisItem.guid) {
        this.linkedItems.push({
          bankedAnalysisId: undefined,
          reportId: item.guid,
          accountAnalysisId: undefined
        });
      }
    });

    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == this.analysisItem.guid) {
          this.linkedItems.push({
            bankedAnalysisId: undefined,
            reportId: undefined,
            accountAnalysisId: accountAnalysisItems[index].guid
          })
        }
      });
    }
  }

  addReport() {
    this.displayCreateReportModal = true;
  }

  cancelCreateReport() {
    this.displayCreateReportModal = false;
  }

  async confirmCreateReport() {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(this.analysisItem.facilityId);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(this.analysisItem.facilityId, this.analysisItem.accountId, 'analysis', groups);
    newReport.analysisItemId = this.analysisItem.guid;
    newReport = await firstValueFrom(this.facilityReportsDbService.addWithObservable(newReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, this.selectedFacility);
    this.toastNotificationService.showToast('Report Created!', 'Analysis report has been created', undefined, false, 'alert-success');
    this.goToReport(newReport.guid);
  }

  openLinkeItemModal(itemGuid: string, type: 'accountAnalysis' | 'bankedAnalysis' | 'facilityReport') {
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

  goToReport(reportGuid: string) {
    let facilityReport: IdbFacilityReport = this.facilityReportsDbService.getByGuid(reportGuid);
    this.facilityReportsDbService.selectedReport.next(facilityReport);
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/reports/setup')
  }

  goToAccountAnalysis(analysisGuid: string) {
    let accountAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getByGuid(analysisGuid);
    this.accountAnalysisDbService.selectedAnalysisItem.next(accountAnalysisItem);
    if (accountAnalysisItem.setupErrors.hasError || accountAnalysisItem.setupErrors.facilitiesSelectionsInvalid) {
      this.router.navigateByUrl('account/analysis/setup');
    } else {
      this.router.navigateByUrl('account/analysis/results');
    }
  }

  goToFacilityAnalysis(analysisGuid: string) {
    let bankedAnalysisItem: IdbAnalysisItem = this.analysisDbService.getByGuid(analysisGuid);
    this.analysisDbService.selectedAnalysisItem.next(bankedAnalysisItem);
    if (bankedAnalysisItem.setupErrors.hasError || bankedAnalysisItem.setupErrors.groupsHaveErrors) {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
    } else {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis/facility-analysis');
    }
  }
}
