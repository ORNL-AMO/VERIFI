import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-utility-meter-data-table',
  templateUrl: './utility-meter-data-table.component.html',
  styleUrls: ['./utility-meter-data-table.component.css']
})
export class UtilityMeterDataTableComponent implements OnInit {

  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  selectedMeter: IdbUtilityMeter;
  meterData: Array<IdbUtilityMeterData>;
  facilityMeters: Array<IdbUtilityMeter>;
  accountMeterDataSub: Subscription;
  hasCheckedItems: boolean;
  meterDataToDelete: IdbUtilityMeterData;
  showDeleteModal: boolean = false;
  showBulkDelete: boolean = false;
  showIndividualDelete: boolean = false;
  paramsSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private sharedDataService: SharedDataService
  ) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      let meterId: number = parseInt(params['id']);
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.selectedMeter = this.facilityMeters.find(meter => { return meter.id == meterId });
      this.setData();
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(data => {
      this.setData();
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.paramsSub.unsubscribe();
  }

  setData() {
    this.meterData = this.utilityMeterDataDbService.getMeterDataForFacility(this.selectedMeter, false, true);
    this.setHasCheckedItems();
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }

  async bulkDelete() {
    this.cancelBulkDelete();
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
  }

  setDeleteMeterData(meterData: IdbUtilityMeterData) {
    this.meterDataToDelete = meterData;
    this.showIndividualDelete = true;
  }

  cancelDelete() {
    this.showIndividualDelete = false;
    this.meterDataToDelete = undefined;
  }

  async deleteMeterData() {
    this.loadingService.setLoadingMessage("Deleting Meter Data...");
    this.loadingService.setLoadingStatus(true);
    this.showIndividualDelete = false;
    await this.utilityMeterDataDbService.deleteWithObservable(this.meterDataToDelete.id).toPromise();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Data Deleted!", undefined, undefined, false, "success");
    this.cancelDelete();
  }

  setHasCheckedItems() {
    this.hasCheckedItems = this.meterData.find(dataItem => { return dataItem.checked == true }) != undefined;
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  meterDataAdd() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.id + '/new-bill');
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.id + '/edit-bill/' + meterData.id);

  }
}
