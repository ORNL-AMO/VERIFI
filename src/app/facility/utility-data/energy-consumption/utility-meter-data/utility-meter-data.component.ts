import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, MeterSource } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilityMeterDataService } from './utility-meter-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-utility-meter-data',
  templateUrl: './utility-meter-data.component.html',
  styleUrls: ['./utility-meter-data.component.css']
})
export class UtilityMeterDataComponent implements OnInit {


  itemsPerPage: number = 6;
  tablePageNumbers: Array<number> = [];
  selectedMeter: IdbUtilityMeter;
  meterData: Array<IdbUtilityMeterData>;

  editMeter: IdbUtilityMeter;
  editMeterData: IdbUtilityMeterData;
  utilityMeters: Array<IdbUtilityMeter>;

  addOrEdit: string;
  hasCheckedItems: boolean;
  meterDataToDelete: IdbUtilityMeterData;
  showDeleteModal: boolean = false;
  showBulkDelete: boolean = false;
  facilityMeters: Array<IdbUtilityMeter>;
  accountMeterDataSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterId: number = parseInt(params['id']);
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.selectedMeter = this.facilityMeters.find(meter => { return meter.id == meterId });
      this.setData();
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(data => {
      this.setData();
    })
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
  }

  setData() {
    this.meterData = this.utilityMeterDataDbService.getMeterDataForFacility(this.selectedMeter, false, true);

  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    this.addOrEdit = 'edit';
    this.editMeter = this.facilityMeters.find(meter => { return meter.guid == meterData.meterId });
    this.editMeterData = meterData;
    this.sharedDataService.modalOpen.next(true);
  }

  cancelEditMeter() {
    this.addOrEdit = undefined;
    this.editMeterData = undefined;
    this.sharedDataService.modalOpen.next(false);
  }

  uploadData() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/upload-data');
  }

  async bulkDelete() {
    this.loadingService.setLoadingMessage("Deleting Meter Data...");
    this.loadingService.setLoadingStatus(true);
    let meterDataItemsToDelete: Array<IdbUtilityMeterData> = new Array();
    this.meterData.forEach(dataItem => {
      if (dataItem.checked) {
        meterDataItemsToDelete.push(dataItem);
      }
    });
    for (let index = 0; index < meterDataItemsToDelete.length; index++) {
      await this.utilityMeterDataDbService.deleteWithObservable(meterDataItemsToDelete[index].id).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Data Deleted!", undefined, undefined, false, "success");
    this.cancelBulkDelete();
  }

  meterDataAdd() {
    this.addOrEdit = 'add';
    this.editMeter = this.facilityMeters.find(meter => { return meter.id == this.selectedMeter.id });
    this.changeSelectedMeter();
  }

  changeSelectedMeter() {
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.editMeter);
    this.sharedDataService.modalOpen.next(true);
  }

  getLastMeterBillDate(meter: IdbUtilityMeter): Date {
    return this.utilityMeterDataDbService.getLastMeterReadingDate(meter);
  }

  setHasCheckedItems() {
    this.hasCheckedItems = this.meterData.find(dataItem => { return dataItem.checked == true }) != undefined;
  }

  setDeleteMeterData(meterData: IdbUtilityMeterData) {
    this.meterDataToDelete = meterData;
  }

  cancelDelete() {
    this.meterDataToDelete = undefined;
  }

  async deleteMeterData() {
    await this.utilityMeterDataDbService.deleteWithObservable(this.meterDataToDelete.id).toPromise();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.cancelDelete();
  }

  async setToggleView(idbMeter) {
    idbMeter.visible = !idbMeter.visible
    await this.utilityMeterDbService.updateWithObservable(idbMeter);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  async ignoreSameMonth(meter: IdbUtilityMeter) {
    meter.ignoreDuplicateMonths = true;
    await this.utilityMeterDbService.updateWithObservable(meter);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  }

  async ignoreMissingMonth(meter: IdbUtilityMeter) {
    meter.ignoreMissingMonths = true;
    await this.utilityMeterDbService.updateWithObservable(meter);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  }
}
