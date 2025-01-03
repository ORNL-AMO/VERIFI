import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-meters-table',
  templateUrl: './facility-meters-table.component.html',
  styleUrl: './facility-meters-table.component.css'
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
    private dbChangesService: DbChangesService
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
    // let deleteMeterId: number = this.meterToDelete.id;
    // let deleteMeterGuid: string = this.meterToDelete.guid;
    // this.meterToDelete = undefined;
    // this.loadingService.setLoadingMessage('Deleting Meters and Data...')
    // this.loadingService.setLoadingStatus(true);
    // //delete meter
    // await firstValueFrom(this.utilityMeterdbService.deleteIndexWithObservable(deleteMeterId));


    // //delete meter data

    // let allMeterData: Array<IdbUtilityMeterData> = await firstValueFrom(this.utilityMeterDatadbService.getAll());
    // let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(meterData => { return meterData.meterId == deleteMeterGuid });
    // for (let index = 0; index < meterData.length; index++) {
    //   await firstValueFrom(this.utilityMeterDatadbService.deleteWithObservable(meterData[index].id));
    // }
    // let selectedFacility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    // //set meters
    // let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterdbService.getAllAccountMeters(selectedFacility.accountId);
    // this.utilityMeterdbService.accountMeters.next(accountMeters);
    // let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.guid });
    // this.utilityMeterdbService.facilityMeters.next(facilityMeters);
    // //set meter data

    // let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDatadbService.getAllAccountMeterData(selectedFacility.accountId);
    // this.utilityMeterDatadbService.accountMeterData.next(accountMeterData);
    // let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == selectedFacility.guid });
    // this.utilityMeterDatadbService.facilityMeterData.next(facilityMeterData);
    // this.cancelDelete();
    // this.loadingService.setLoadingStatus(false);
    // this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
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

  selectEditMeter(meter: IdbUtilityMeter) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('data-wizard/' + account.guid + '/facilities/' + facility.guid + '/meters/meter/' + meter.guid);
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
