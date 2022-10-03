import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-analysis-dashboard',
  templateUrl: './analysis-dashboard.component.html',
  styleUrls: ['./analysis-dashboard.component.css']
})
export class AnalysisDashboardComponent implements OnInit {

  facilityAnalysisItems: Array<IdbAnalysisItem>;
  facilityAnalysisItemsSub: Subscription;

  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';

  itemToDelete: IdbAnalysisItem;
  baselineYearErrorMin: boolean;
  baselineYearErrorMax: boolean;
  yearOptions: Array<number>;
  selectedFacility: IdbFacility;
  selectedFacilityMeterDataSub: Subscription;

  constructor(private router: Router, private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.facilityAnalysisItems = items;
    });

    this.selectedFacilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
      this.yearOptions = this.analysisCalculationsHelperService.getYearOptions();
      if (this.yearOptions) {
        this.baselineYearErrorMin = this.yearOptions[0] > this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear;
        this.baselineYearErrorMax = this.yearOptions[this.yearOptions.length - 1] < this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear
      }
    });
  }

  ngOnDestroy() {
    this.facilityAnalysisItemsSub.unsubscribe();
    this.selectedFacilityMeterDataSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAnalysisItem = this.analysisDbService.getNewAnalysisItem();
    let addedItem: IdbAnalysisItem = await this.analysisDbService.addWithObservable(newItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('New Analysis Created', undefined, undefined, false, "success");
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }

  selectAnalysisItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    //todo: route to results if item setup
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }

  deleteItem(item: IdbAnalysisItem) {
    this.itemToDelete = item;
  }

  cancelDelete() {
    this.itemToDelete = undefined;
  }

  async confirmDelete() {
    await this.analysisDbService.deleteWithObservable(this.itemToDelete.id).toPromise();
    //update account analysis items
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      let updated: boolean = false;
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == this.itemToDelete.guid) {
          item.analysisItemId = undefined;
          updated = true;
        }
      });
      if (updated) {
        await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]).toPromise();
      }
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount)
    await this.dbChangesService.setAnalysisItems(selectedAccount, this.selectedFacility);
    this.itemToDelete = undefined;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "success");
  }

  editItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
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

  async createCopy(analysisItem: IdbAnalysisItem) {
    let newItem: IdbAnalysisItem = JSON.parse(JSON.stringify(analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + " (Copy)";
    let addedItem: IdbAnalysisItem = await this.analysisDbService.addWithObservable(newItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Copy Created', undefined, undefined, false, "success");
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }
}
