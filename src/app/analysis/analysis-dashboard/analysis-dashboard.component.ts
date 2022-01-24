import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idb';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';

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
  constructor(private router: Router, private analysisDbService: AnalysisDbService, private toastNotificationService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.facilityAnalysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.facilityAnalysisItems = items;
    });
  }

  ngOnDestroy() {
    this.facilityAnalysisItemsSub.unsubscribe();
  }

  async createAnalysis() {
    let newItem: IdbAnalysisItem = this.analysisDbService.getNewAnalysisItem();
    let addedItem: IdbAnalysisItem = await this.analysisDbService.addWithObservable(newItem).toPromise();
    this.analysisDbService.setAccountAnalysisItems();
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.router.navigateByUrl('/analysis/run-analysis');
  }

  selectAnalysisItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    //todo: route to results if item setup
    this.router.navigateByUrl('/analysis/run-analysis');
  }

  deleteItem(item: IdbAnalysisItem) {
    this.itemToDelete = item;
  }

  cancelDelete() {
    this.itemToDelete = undefined;
  }

  async confirmDelete() {
    await this.analysisDbService.deleteWithObservable(this.itemToDelete.id).toPromise();
    this.analysisDbService.setAccountAnalysisItems();
    this.itemToDelete = undefined;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "success");
  }

  editItem(item: IdbAnalysisItem) {
    this.analysisDbService.selectedAnalysisItem.next(item);
    this.router.navigateByUrl('/analysis/run-analysis');
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
