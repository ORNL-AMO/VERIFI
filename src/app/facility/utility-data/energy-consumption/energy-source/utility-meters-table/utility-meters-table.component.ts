import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';

@Component({
  selector: 'app-utility-meters-table',
  templateUrl: './utility-meters-table.component.html',
  styleUrls: ['./utility-meters-table.component.css']
})
export class UtilityMetersTableComponent implements OnInit {
  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;

  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  meterList: Array<IdbUtilityMeter>;
  meterListSub: Subscription;
  meterToDelete: IdbUtilityMeter;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';
  copyingTable: boolean = false;
  constructor(private utilityMeterdbService: UtilityMeterdbService,
    private copyTableService: CopyTableService,
    private router: Router,
    private facilitydbService: FacilitydbService,
    private loadingService: LoadingService,
    private utilityMeterDatadbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private toastNotificationsService: ToastNotificationsService,
    private editMeterFormService: EditMeterFormService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.meterListSub = this.utilityMeterdbService.facilityMeters.subscribe(meters => {
      this.meterList = this.checkMeterUnits(meters);
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    })
  }

  ngOnDestroy() {
    this.meterListSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }

  addMeter() {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/energy-consumption/energy-source/new-meter');
  }


  checkMeterUnits(meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    meters.forEach(meter => {
      let differentUnits: { differentEnergyUnit: boolean, emissionsOutputRate: boolean, differentCollectionUnit: boolean } = this.energyUnitsHelperService.checkHasDifferentUnits(meter.source, meter.phase, meter.startingUnit, meter.fuel, this.selectedFacility, meter.energyUnit);
      meter.unitsDifferent = differentUnits.emissionsOutputRate;
    });
    return meters;
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200)
  }

  selectDeleteMeter(meter: IdbUtilityMeter) {
    this.meterToDelete = meter;
  }

  cancelDelete() {
    this.meterToDelete = undefined;
  }

  async deleteMeter() {
    this.loadingService.setLoadingMessage('Deleteing Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    //delete meter
    await this.utilityMeterdbService.deleteIndexWithObservable(this.meterToDelete.id).toPromise();


    //delete meter data
    let meterData: Array<IdbUtilityMeterData> = await this.utilityMeterDatadbService.getAllByIndexRange('meterId', this.meterToDelete.guid).toPromise();
    for (let index = 0; index < meterData.length; index++) {
      await this.utilityMeterDatadbService.deleteWithObservable(meterData[index].id).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    //set meters
    let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterdbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterdbService.accountMeters.next(accountMeters);
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.guid });
    this.utilityMeterdbService.facilityMeters.next(facilityMeters);
    //set meter data
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDatadbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterDatadbService.accountMeterData.next(accountMeterData);
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == selectedFacility.guid });
    this.utilityMeterDatadbService.facilityMeterData.next(facilityMeterData);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "success");
  }


  isMeterInvalid(meter: IdbUtilityMeter): boolean {
    let form: FormGroup = this.editMeterFormService.getFormFromMeter(meter);
    return form.invalid;
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
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/energy-consumption/energy-source/edit-meter/' + meter.guid);
  }

  async createCopy(meter: IdbUtilityMeter) {
    let copyMeter: IdbUtilityMeter = JSON.parse(JSON.stringify(meter));
    delete copyMeter.id;
    copyMeter.guid = Math.random().toString(36).substr(2, 9);
    copyMeter.name = copyMeter.name + ' (copy)';
    copyMeter = await this.utilityMeterdbService.addWithObservable(copyMeter).toPromise();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(account, facility);
    this.selectEditMeter(copyMeter);
  }
}
