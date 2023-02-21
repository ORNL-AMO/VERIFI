import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbOverviewReportOptions } from 'src/app/models/idb';

@Component({
  selector: 'app-account-analysis-item-card',
  templateUrl: './account-analysis-item-card.component.html',
  styleUrls: ['./account-analysis-item-card.component.css']
})
export class AccountAnalysisItemCardComponent implements OnInit {
  @Input()
  analysisItem: IdbAccountAnalysisItem;

  showDetailSub: Subscription;
  showDetail: boolean;
  displayDeleteModal: boolean = false;
  constructor(private router: Router,
    private analysisService: AnalysisService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService) { }

  ngOnInit(): void {
    this.showDetailSub = this.analysisService.showDetail.subscribe(val => {
      this.showDetail = val;
    });
  }

  ngOnDestroy() {
    this.showDetailSub.unsubscribe();
  }

  selectAnalysisItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisItem);
    //todo: route to results if item setup
    this.router.navigateByUrl('account/analysis/setup');
  }

  deleteItem() {
    this.displayDeleteModal = true;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.accountAnalysisDbService.deleteWithObservable(this.analysisItem.id).toPromise();
    let overviewReportOptions: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    let updateReportOptions: boolean = false;
    for (let i = 0; i < overviewReportOptions.length; i++) {
      if (overviewReportOptions[i].reportOptionsType == 'betterPlants') {
        if (overviewReportOptions[i].reportOptions.analysisItemId == this.analysisItem.guid) {
          overviewReportOptions[i].reportOptions.analysisItemId = undefined;
          await this.overviewReportOptionsDbService.updateWithObservable(overviewReportOptions[i]).toPromise();
          updateReportOptions = true;
        }
      }
    }
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount);
    if (updateReportOptions) {
      await this.dbChangesService.setAccountOverviewReportOptions(selectedAccount);
    }
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "bg-success");
  }

  async setUseItem() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let i = 0; i < accountAnalysisItems.length; i++) {
      if (accountAnalysisItems[i].guid == this.analysisItem.guid) {
        if (accountAnalysisItems[i].selectedYearAnalysis) {
          accountAnalysisItems[i].selectedYearAnalysis = false;
        } else {
          accountAnalysisItems[i].selectedYearAnalysis = true;
        }
        await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]).toPromise();
      } else if (accountAnalysisItems[i].reportYear == this.analysisItem.reportYear && accountAnalysisItems[i].selectedYearAnalysis) {
        accountAnalysisItems[i].selectedYearAnalysis = false;
        await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]).toPromise();
      }
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount);
  }

  async createCopy() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let newItem: IdbAccountAnalysisItem = JSON.parse(JSON.stringify(this.analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + ' (Copy)';
    newItem.guid = Math.random().toString(36).substr(2, 9);
    let addedItem: IdbAccountAnalysisItem = await this.accountAnalysisDbService.addWithObservable(newItem).toPromise();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Copy Created', undefined, undefined, false, "bg-success");
    this.router.navigateByUrl('account/analysis/setup');
  }
}
