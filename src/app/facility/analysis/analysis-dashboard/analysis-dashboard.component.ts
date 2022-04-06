import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

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
  baselineYearError: boolean;
  yearOptions: Array<number>;
  selectedFacility: IdbFacility;
  selectedFacilityMeterDataSub: Subscription;

  constructor(private router: Router, private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private facilityDbService: FacilitydbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.facilityAnalysisItems = items;
    });

    this.selectedFacilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
      this.yearOptions = this.analysisCalculationsHelperService.getYearOptions();
      if (this.yearOptions) {
        this.baselineYearError = this.yearOptions[0] > this.selectedFacility.sustainabilityQuestions.energyReductionBaselineYear
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
    this.analysisDbService.setAccountAnalysisItems();
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
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
        if (item.facilityId == this.selectedFacility.id && item.analysisItemId == this.itemToDelete.id) {
          item.analysisItemId = undefined;
          updated = true;
        }
      });
      if (updated) {
        this.accountAnalysisDbService.update(accountAnalysisItems[index]);
      }
    }
    this.analysisDbService.setAccountAnalysisItems();
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
}
