import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport } from 'src/app/models/idb';

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
  selectedAccount: IdbAccount;
  constructor(private router: Router,
    private analysisService: AnalysisService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.showDetailSub = this.analysisService.showDetail.subscribe(val => {
      this.showDetail = val;
    });
  }

  ngOnDestroy() {
    this.showDetailSub.unsubscribe();
  }

  selectAnalysisItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisItem);
    //todo: route to results if item setup (issue-1193)
    this.router.navigateByUrl('account/analysis/setup');
  }

  deleteItem() {
    this.displayDeleteModal = true;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    await firstValueFrom(this.accountAnalysisDbService.deleteWithObservable(this.analysisItem.id));
    let accountReports: Array<IdbAccountReport> = this.accountReportDbService.accountReports.getValue();
    let updateReportOptions: boolean = false;
    for (let i = 0; i < accountReports.length; i++) {
      if (accountReports[i].betterPlantsReportSetup.analysisItemId == this.analysisItem.guid) {
        accountReports[i].betterPlantsReportSetup.analysisItemId = undefined;
        await firstValueFrom(this.accountReportDbService.updateWithObservable(accountReports[i]));
        updateReportOptions = true;
      }
    }
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
    if (updateReportOptions) {
      await this.dbChangesService.setAccountOverviewReportOptions(this.selectedAccount);
    }
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
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
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
      } else if (accountAnalysisItems[i].reportYear == this.analysisItem.reportYear && accountAnalysisItems[i].selectedYearAnalysis) {
        accountAnalysisItems[i].selectedYearAnalysis = false;
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[i]));
      }
    }
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
  }

  async createCopy() {
    let newItem: IdbAccountAnalysisItem = JSON.parse(JSON.stringify(this.analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + ' (Copy)';
    newItem.guid = Math.random().toString(36).substr(2, 9);
    let addedItem: IdbAccountAnalysisItem = await firstValueFrom(this.accountAnalysisDbService.addWithObservable(newItem));
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('account/analysis/setup');
  }
}
