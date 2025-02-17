import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-meters-table',
  templateUrl: './facility-meters-table.component.html',
  styleUrl: './facility-meters-table.component.css',
  standalone: false
})
export class FacilityMetersTableComponent {
  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;


  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;

  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;


  meterToDelete: IdbUtilityMeter;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';
  copyingTable: boolean = false;
  facility: IdbFacility;
  facilitySub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private sharedDataService: SharedDataService,
    private copyTableService: CopyTableService,
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private loadingService: LoadingService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private toastNotificationsService: ToastNotificationsService
  ) {

  }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(meters => {
      this.facilityMeters = meters;
    });
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });

  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }


  uploadData() {

  }

  async addMeter() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let newMeter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, facility.accountId, true, facility.energyUnit);
    newMeter = await firstValueFrom(this.utilityMeterDbService.addWithObservable(newMeter));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(account, facility);
    this.selectEditMeter(newMeter);
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200)
  }

  selectDeleteMeter(meter: IdbUtilityMeter) {
    this.sharedDataService.modalOpen.next(true);
    this.meterToDelete = meter;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.meterToDelete = undefined;
  }

  async deleteMeter() {
    let deleteMeterId: number = this.meterToDelete.id;
    let deleteMeterGuid: string = this.meterToDelete.guid;
    this.meterToDelete = undefined;
    this.loadingService.setLoadingMessage('Deleting Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    //delete meter
    await firstValueFrom(this.utilityMeterDbService.deleteIndexWithObservable(deleteMeterId));
    //delete meter data
    let allMeterData: Array<IdbUtilityMeterData> = await firstValueFrom(this.utilityMeterDataDbService.getAll());
    let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(meterData => { return meterData.meterId == deleteMeterGuid });
    for (let index = 0; index < meterData.length; index++) {
      await firstValueFrom(this.utilityMeterDataDbService.deleteWithObservable(meterData[index].id));
    }

    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    //set meters
    await this.dbChangesService.setMeters(account, selectedFacility);
    //set meter data
    await this.dbChangesService.setMeterData(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
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

  async selectEditMeter(meter: IdbUtilityMeter) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    meter.sidebarOpen = true;
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
    await this.dbChangesService.setMeters(account, facility);
    this.router.navigateByUrl('data-wizard/' + account.guid + '/facilities/' + facility.guid + '/meters/' + meter.guid);
  }

  async createCopy(meter: IdbUtilityMeter) {
    let copyMeter: IdbUtilityMeter = JSON.parse(JSON.stringify(meter));
    delete copyMeter.id;
    copyMeter.guid = Math.random().toString(36).substr(2, 9);
    copyMeter.name = copyMeter.name + ' (copy)';
    copyMeter = await firstValueFrom(this.utilityMeterDbService.addWithObservable(copyMeter));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(account, facility);
    this.selectEditMeter(copyMeter);
  }
}
