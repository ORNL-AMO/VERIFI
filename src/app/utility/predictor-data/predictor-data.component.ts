import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-predictor-data',
  templateUrl: './predictor-data.component.html',
  styleUrls: ['./predictor-data.component.css']
})
export class PredictorDataComponent implements OnInit {

  itemsPerPage: number = 6;
  currentPageNumber: number = 1;

  facilityPredictors: Array<PredictorData>;
  facilityPredictorsSub: Subscription;
  facilityPredictorEntries: Array<IdbPredictorEntry>;
  facilityPredictorEntriesSub: Subscription;

  predictorEntryToDelete: IdbPredictorEntry;

  predictorEntryToEdit: IdbPredictorEntry;
  showPredictorMenu: boolean = false;
  showEditPredictors: boolean = false;
  addOrEdit: "add" | "edit";
  allChecked: boolean = false;
  hasCheckedItems: boolean = false;
  showBulkDelete: boolean = false;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  hasData: boolean;
  constructor(private predictorsDbService: PredictordbService, private router: Router, private loadingService: LoadingService,
    private facilityDbService: FacilitydbService, private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.facilityPredictorsSub = this.predictorsDbService.facilityPredictors.subscribe(predictors => {
      this.facilityPredictors = predictors;
      this.setHasData();
    });

    this.facilityPredictorEntriesSub = this.predictorsDbService.facilityPredictorEntries.subscribe(entries => {
      this.facilityPredictorEntries = entries;
      this.setHasChecked();
      this.setHasData();
    });
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.facilityPredictorEntriesSub.unsubscribe();
  }

  setHasData() {
    this.hasData = (this.facilityPredictors && this.facilityPredictors.length != 0) || (this.facilityPredictorEntries && this.facilityPredictorEntries.length != 0);
  }


  addPredictorEntry() {
    this.addOrEdit = "add";
    this.predictorEntryToEdit = this.predictorsDbService.getNewPredictorEntry();
  }

  setDeletePredictorEntry(predictorEntry: IdbPredictorEntry) {
    this.predictorEntryToDelete = predictorEntry;
  }

  async confirmDeletePredictorEntry() {
    await this.predictorsDbService.deleteIndexWithObservable(this.predictorEntryToDelete.id).toPromise();
    this.cancelDeletePredictorEntry();
    await this.finishDelete();
  }

  cancelDeletePredictorEntry() {
    this.predictorEntryToDelete = undefined;
  }

  setEditPredictorEntry(predictorEntry: IdbPredictorEntry) {
    this.addOrEdit = "edit";
    this.predictorEntryToEdit = predictorEntry;
  }

  cancelEditPredictorEntry() {
    this.predictorEntryToEdit = undefined;
  }

  togglePredictorMenu() {
    this.showPredictorMenu = !this.showPredictorMenu;
  }

  editPredictors() {
    this.showEditPredictors = true;
  }

  closeEditPredictors() {
    this.showEditPredictors = false;
    this.showPredictorMenu = false;
  }

  uploadData() {
    this.router.navigateByUrl('utility/upload-data');
  }

  checkAll() {
    let orderedItems: Array<IdbPredictorEntry> = this.getOrderedData();
    let displayedItems: Array<IdbPredictorEntry> = orderedItems.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      item.checked = this.allChecked;
    });
    this.hasCheckedItems = (this.allChecked == true);
  }

  getOrderedData(): Array<IdbPredictorEntry> {
    if (this.orderDataField == 'date') {
      return _.orderBy(this.facilityPredictorEntries, this.orderDataField, this.orderByDirection)
    } else {
      return _.orderBy(this.facilityPredictorEntries, (data: IdbPredictorEntry) => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.name == this.orderDataField });
        if (predictorData) {
          return predictorData.amount;
        } else {
          return;
        }
      }, this.orderByDirection);
    }
  }

  setHasChecked() {
    let hasChecked: boolean = false;
    let predictorEntries: Array<IdbPredictorEntry> = this.getOrderedData();
    let displayedItems: Array<IdbPredictorEntry> = predictorEntries.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      if (item.checked) {
        hasChecked = true;
      }
    });
    this.hasCheckedItems = hasChecked;
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  async bulkDelete() {
    this.loadingService.setLoadingMessage("Deleting Predictor Entries...");
    this.loadingService.setLoadingStatus(true);
    let checkedItems: Array<IdbPredictorEntry> = new Array();
    this.facilityPredictorEntries.forEach(entry => {
      if (entry.checked == true) {
        checkedItems.push(entry);
      }
    })
    for (let index = 0; index < checkedItems.length; index++) {
      await this.predictorsDbService.deleteIndexWithObservable(checkedItems[index].id).toPromise();
    }

    this.allChecked = false;
    this.cancelBulkDelete();
    await this.finishDelete();
  }

  async finishDelete() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountPredictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.predictorsDbService.accountPredictorEntries.next(accountPredictors);
    let facilityPredictors: Array<IdbPredictorEntry> = accountPredictors.filter(predictor => { return predictor.facilityId == selectedFacility.id });
    this.predictorsDbService.facilityPredictorEntries.next(facilityPredictors);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Predictor Data Deleted!", undefined, undefined, false, "success");
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
