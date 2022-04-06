import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';

@Component({
  selector: 'app-account-analysis-dashboard',
  templateUrl: './account-analysis-dashboard.component.html',
  styleUrls: ['./account-analysis-dashboard.component.css']
})
export class AccountAnalysisDashboardComponent implements OnInit {

  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  accountAnalysisItemsSub: Subscription;

  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';

  itemToDelete: IdbAccountAnalysisItem;
  baselineYearError: boolean;
  yearOptions: Array<number>;
  selectedAccount: IdbAccount;
  constructor(private router: Router, private accountAnalysisDbService: AccountAnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private accountDbService: AccountdbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.accountAnalysisItems = items;
    });

    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions(true);
    if (this.yearOptions) {
      this.baselineYearError = this.yearOptions[0] > this.selectedAccount.sustainabilityQuestions.energyReductionBaselineYear
    }
  }

  ngOnDestroy() {
    this.accountAnalysisItemsSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getNewAccountAnalysisItem();
    let addedItem: IdbAccountAnalysisItem = await this.accountAnalysisDbService.addWithObservable(newItem).toPromise();
    this.accountAnalysisDbService.setAccountAnalysisItems();
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.router.navigateByUrl('account/analysis/setup');
  }

  selectAnalysisItem(item: IdbAccountAnalysisItem) {
    this.accountAnalysisDbService.selectedAnalysisItem.next(item);
    //todo: route to results if item setup
    this.router.navigateByUrl('account/analysis/setup');
  }

  deleteItem(item: IdbAccountAnalysisItem) {
    this.itemToDelete = item;
  }

  cancelDelete() {
    this.itemToDelete = undefined;
  }

  async confirmDelete() {
    await this.accountAnalysisDbService.deleteWithObservable(this.itemToDelete.id).toPromise();
    this.accountAnalysisDbService.setAccountAnalysisItems();
    this.itemToDelete = undefined;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "success");
  }

  editItem(item: IdbAccountAnalysisItem) {
    this.accountAnalysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('account/analysis/setup');
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

}
