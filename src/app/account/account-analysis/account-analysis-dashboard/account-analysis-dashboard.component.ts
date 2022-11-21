import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
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
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';

  itemToDelete: IdbAccountAnalysisItem;
  baselineYearError: boolean;
  yearOptions: Array<number>;
  selectedAccount: IdbAccount;
  constructor(private router: Router, private accountAnalysisDbService: AccountAnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private accountDbService: AccountdbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private dbChangesService: DbChangesService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItemsSub = this.accountAnalysisDbService.accountAnalysisItems.subscribe(items => {
      this.accountAnalysisItems = items;
    });

    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions(true);
    if (this.yearOptions) {
      this.baselineYearError = this.yearOptions[0] > this.selectedAccount.sustainabilityQuestions.energyReductionBaselineYear
    }

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    })
  }

  ngOnDestroy() {
    this.accountAnalysisItemsSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.getNewAccountAnalysisItem();
    let addedItem: IdbAccountAnalysisItem = await this.accountAnalysisDbService.addWithObservable(newItem).toPromise();
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Created', undefined, undefined, false, "success");
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
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
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

  async createCopy(analysisItem: IdbAccountAnalysisItem){
    let newItem: IdbAccountAnalysisItem = JSON.parse(JSON.stringify(analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + ' (Copy)';
    let addedItem: IdbAccountAnalysisItem = await this.accountAnalysisDbService.addWithObservable(newItem).toPromise();
    await this.dbChangesService.setAccountAnalysisItems(this.selectedAccount);
    this.accountAnalysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Item Copy Created', undefined, undefined, false, "success");
    this.router.navigateByUrl('account/analysis/setup');

  }

}
