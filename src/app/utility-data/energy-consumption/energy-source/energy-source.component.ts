import { Component, OnInit } from '@angular/core';
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db.service";
import { UtilityMeterDatadbService } from "../../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db.service";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { EditMeterFormService } from './edit-meter-form/edit-meter-form.service';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-energy-source',
  templateUrl: './energy-source.component.html',
  styleUrls: ['./energy-source.component.css']
})
export class EnergySourceComponent implements OnInit {

  meterList: Array<IdbUtilityMeter>;
  meterListSub: Subscription;

  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
  importWindow: boolean;
  editMeter: IdbUtilityMeter;
  meterToDelete: IdbUtilityMeter;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;

  addOrEdit: string = 'add';
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';
  constructor(
    private accountdbService: AccountdbService,
    private facilitydbService: FacilitydbService,
    private utilityMeterDatadbService: UtilityMeterDatadbService,
    private utilityMeterdbService: UtilityMeterdbService,
    private editMeterFormService: EditMeterFormService,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private sharedDataService: SharedDataService
  ) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.meterListSub = this.utilityMeterdbService.facilityMeters.subscribe(meters => {
      this.meterList = this.checkMeterUnits(meters);
    });

  }

  ngOnDestroy() {
    this.meterListSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }


  addMeter() {
    let selectedFacility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
    this.addOrEdit = 'add';
    this.editMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedAccount.id, true, selectedFacility.emissionsOutputRate, selectedFacility.energyUnit);
    this.sharedDataService.modalOpen.next(true);
  }

  uploadData() {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/upload-data');
  }

  selectEditMeter(meter: IdbUtilityMeter) {
    this.addOrEdit = 'edit';
    this.editMeter = meter;
    this.sharedDataService.modalOpen.next(true);
  }

  closeEditMeter() {
    this.editMeter = undefined;
    this.sharedDataService.modalOpen.next(false);
  }

  async deleteMeter() {
    this.loadingService.setLoadingMessage('Deleteing Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    //delete meter
    await this.utilityMeterdbService.deleteIndexWithObservable(this.meterToDelete.id).toPromise();


    //delete meter data
    let meterData: Array<IdbUtilityMeterData> = await this.utilityMeterDatadbService.getAllByIndexRange('meterId', this.meterToDelete.id).toPromise();
    for (let index = 0; index < meterData.length; index++) {
      await this.utilityMeterDatadbService.deleteWithObservable(meterData[index].id).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    //set meters
    let accountMeters: Array<IdbUtilityMeter> = await this.utilityMeterdbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterdbService.accountMeters.next(accountMeters);
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.id });
    this.utilityMeterdbService.facilityMeters.next(facilityMeters);
    //set meter data
    let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDatadbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterDatadbService.accountMeterData.next(accountMeterData);
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == selectedFacility.id });
    this.utilityMeterDatadbService.facilityMeterData.next(facilityMeterData);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "success");
  }

  selectDeleteMeter(meter: IdbUtilityMeter) {
    this.meterToDelete = meter;
  }

  cancelDelete() {
    this.meterToDelete = undefined;
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

  checkMeterUnits(meters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    meters.forEach(meter => {
      let differentUnits: { differentEnergyUnit: boolean, emissionsOutputRate: boolean, differentCollectionUnit: boolean } = this.energyUnitsHelperService.checkHasDifferentUnits(meter.source, meter.phase, meter.emissionsOutputRate, meter.startingUnit, meter.fuel, this.selectedFacility, meter.energyUnit);
      meter.unitsDifferent = differentUnits.emissionsOutputRate;
    });
    return meters;
  }

}