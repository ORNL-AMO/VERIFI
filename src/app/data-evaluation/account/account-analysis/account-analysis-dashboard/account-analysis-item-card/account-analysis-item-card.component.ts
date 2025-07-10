import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-account-analysis-item-card',
    templateUrl: './account-analysis-item-card.component.html',
    styleUrls: ['./account-analysis-item-card.component.css'],
    standalone: false
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
    if (this.analysisItem.setupErrors.hasError || this.analysisItem.setupErrors.facilitiesSelectionsInvalid) {
      this.router.navigateByUrl('account/analysis/setup');
    } else {
      this.router.navigateByUrl('account/analysis/results');
    }
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
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
  }

  async setUseItem() {
    let canSelectItem: boolean = this.getCanSelectItem(this.selectedAccount, this.analysisItem);
    if (canSelectItem) {
      let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
      let categoryItems: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(item => { return item.analysisCategory == this.analysisItem.analysisCategory });
      for (let i = 0; i < categoryItems.length; i++) {
        if (categoryItems[i].guid == this.analysisItem.guid) {
          if (categoryItems[i].selectedYearAnalysis) {
            categoryItems[i].selectedYearAnalysis = false;
          } else {
            categoryItems[i].selectedYearAnalysis = true;
          }
          await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(categoryItems[i]));
        } else if (categoryItems[i].reportYear == this.analysisItem.reportYear && categoryItems[i].selectedYearAnalysis) {
          categoryItems[i].selectedYearAnalysis = false;
          await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(categoryItems[i]));
        }
      }
      await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount, false);
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
}
