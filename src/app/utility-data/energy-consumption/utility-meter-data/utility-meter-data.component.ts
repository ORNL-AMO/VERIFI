import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, MeterSource } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilityMeterDataService } from './utility-meter-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-utility-meter-data',
  templateUrl: './utility-meter-data.component.html',
  styleUrls: ['./utility-meter-data.component.css']
})
export class UtilityMeterDataComponent implements OnInit {

  @ViewChildren("masterCheckbox") masterCheckbox: QueryList<ElementRef>;
  @ViewChild('inputFile') myInputVariable: ElementRef;

  meterList: Array<{
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>,
    errorDate: Date,
    warningDate: Date,
    missingMonth: Date
  }>;

  itemsPerPage: number = 6;
  tablePageNumbers: Array<number> = [];

  accountMeterDataSub: Subscription;
  facilityMetersSub: Subscription;
  editMeterData: IdbUtilityMeterData;
  utilityMeters: Array<IdbUtilityMeter>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  meterDataMenuOpen: number;
  showImport: boolean;
  addOrEdit: string;
  selectedSource: MeterSource;
  hasCheckedItems: boolean;
  meterDataToDelete: IdbUtilityMeterData;
  showDeleteModal: boolean = false;
  showBulkDelete: boolean = false;
  facilityMeters: Array<IdbUtilityMeter>;
  selectedMeter: IdbUtilityMeter;
  meterListHasData: boolean = false;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private activatedRoute: ActivatedRoute,
    private utilityMeterDataService: UtilityMeterDataService,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService
  ) { }

  ngOnInit() {
    this.activatedRoute.url.subscribe(url => {
      this.setUtilitySource(url[0].path);
      this.setData();
    })
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(val => {
      this.facilityMeters = val;
      this.setData();
    });
    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(() => {
      this.setData();
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.facilityMetersSub.unsubscribe();
  }

  setUtilitySource(urlPath: string) {
    if (urlPath == 'electricity') {
      this.selectedSource = 'Electricity';
    } else if (urlPath == 'natural-gas') {
      this.selectedSource = 'Natural Gas';
    } else if (urlPath == 'other-fuels') {
      this.selectedSource = 'Other Fuels';
    } else if (urlPath == 'other-energy') {
      this.selectedSource = 'Other Energy';
    } else if (urlPath == 'water') {
      this.selectedSource = 'Water';
    } else if (urlPath == 'waste-water') {
      this.selectedSource = 'Waste Water';
    } else if (urlPath == 'other-utility') {
      this.selectedSource = 'Other Utility';
    }
  }

  setData() {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    this.utilityMeters = facilityMeters.filter(meter => { return meter.source == this.selectedSource });
    this.setMeterList();
    this.tablePageNumbers = this.meterList.map(() => { return 1 });
  }


  setMeterList() {
    this.meterListHasData = false;
    this.meterList = new Array();
    this.utilityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter, false, true);
      if (meterData.length != 0) {
        this.meterListHasData = true;
      }
      let checkDate: {error: Date, warning: Date, missingMonth: Date } = this.utilityMeterDataService.checkForErrors(meterData, meter);
      this.meterList.push({
        idbMeter: meter,
        meterDataItems: meterData,
        errorDate: checkDate.error,
        warningDate: checkDate.warning,
        missingMonth: checkDate.missingMonth
      });
    });
    this.setHasCheckedItems();
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    this.addOrEdit = 'edit';
    this.selectedMeter = this.facilityMeters.find(meter => { return meter.id == meterData.meterId });
    this.editMeterData = meterData;
  }

  cancelEditMeter() {
    this.addOrEdit = undefined;
    this.editMeterData = undefined;
    this.meterDataMenuOpen = undefined;
  }

  meterDataToggleMenu(meterId: number) {
    this.meterDataMenuOpen = meterId;
  }

  uploadData() {
    this.router.navigateByUrl('utility/upload-data');
  }

  closeImportModal() {
    this.showImport = false;
    this.meterDataMenuOpen = undefined;
  }

  async bulkDelete() {
    this.loadingService.setLoadingMessage("Deleting Meter Data...");
    this.loadingService.setLoadingStatus(true);
    let meterDataItemsToDelete: Array<IdbUtilityMeterData> = new Array();
    this.meterList.forEach(meterListItem => {
      meterListItem.meterDataItems.forEach(meterDataItem => {
        if (meterDataItem.checked) {
          meterDataItemsToDelete.push(meterDataItem);
        }
      })
    });
    for (let index = 0; index < meterDataItemsToDelete.length; index++) {
      await this.utilityMeterDataDbService.deleteWithObservable(meterDataItemsToDelete[index].id).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterDataDbService.accountMeterData.next(accountMeterData);
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(dataItem => { return dataItem.facilityId == selectedFacility.id });
    this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Data Deleted!", undefined, undefined, false, "success");
    this.cancelBulkDelete();
  }

  meterDataAdd() {
    this.addOrEdit = 'add';
    this.selectedMeter = this.facilityMeters.find(meter => { return meter.source == this.selectedSource });
    this.changeSelectedMeter();
  }

  changeSelectedMeter() {
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.selectedMeter);
  }

  getLastMeterBillDate(meter: IdbUtilityMeter): Date {
    return this.utilityMeterDataDbService.getLastMeterReadingDate(meter);
  }

  setHasCheckedItems() {
    if (this.meterList.length != 0) {
      let findCheckedItem: { idbMeter: IdbUtilityMeter, meterDataItems: Array<IdbUtilityMeterData> } = this.meterList.find(meterItem => {
        return meterItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == true });
      });
      this.hasCheckedItems = (findCheckedItem != undefined);
    } else {
      this.hasCheckedItems = false;
    }
  }

  setDeleteMeterData(meter: IdbUtilityMeterData) {
    this.meterDataToDelete = meter;
  }

  cancelDelete() {
    this.meterDataToDelete = undefined;
    this.meterDataMenuOpen = undefined;
  }

  deleteMeterData() {
    this.utilityMeterDataDbService.deleteIndex(this.meterDataToDelete.id);
    this.cancelDelete();
  }

  setToggleView(idbMeter) {
    idbMeter.visible = !idbMeter.visible
    this.utilityMeterDbService.update(idbMeter);
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  ignoreSameMonth(meter: IdbUtilityMeter){
    meter.ignoreDuplicateMonths = true;
    this.utilityMeterDbService.update(meter);
  }

  ignoreMissingMonth(meter: IdbUtilityMeter){
    meter.ignoreMissingMonths = true;
    this.utilityMeterDbService.update(meter);
  }
}
