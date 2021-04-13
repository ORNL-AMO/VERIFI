import { Component, OnInit } from '@angular/core';
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db.service";
import { UtilityMeterDatadbService } from "../../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db.service";
import { listAnimation } from '../../../animations';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { EditMeterFormService } from './edit-meter-form/edit-meter-form.service';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingService } from 'src/app/shared/loading/loading.service';

@Component({
  selector: 'app-energy-source',
  templateUrl: './energy-source.component.html',
  styleUrls: ['./energy-source.component.css'],
  animations: [
    listAnimation
  ]
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
  selectedFacilityName: string = 'Facility';

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
    private loadingService: LoadingService
  ) { }

  ngOnInit() {
    this.meterListSub = this.utilityMeterdbService.facilityMeters.subscribe(meters => {
      this.meterList = meters;
    });

    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      if (facility) {
        this.selectedFacilityName = facility.name;
      }
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
    this.editMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedAccount.id, true);
  }

  uploadData() {
    this.router.navigateByUrl('utility/upload-data');
  }

  selectEditMeter(meter: IdbUtilityMeter) {
    this.addOrEdit = 'edit';
    this.editMeter = meter;
  }

  closeEditMeter() {
    this.editMeter = undefined;
  }

  async deleteMeter() {
    this.loadingService.setLoadingMessage('Deleteing Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    //delete meter
    await this.utilityMeterdbService.deleteIndexWithObservable(this.meterToDelete.id);
    //delete meter data
    this.utilityMeterDatadbService.getAllByIndexRange('meterId', this.meterToDelete.id).subscribe(data => {
      data.forEach(item => { this.deleteMeterData(item) });
      this.utilityMeterdbService.setAccountMeters();
      this.utilityMeterdbService.setFacilityMeters();
      this.utilityMeterDatadbService.setAccountMeterData();
      this.utilityMeterDatadbService.setFacilityMeterData();
      this.cancelDelete();
      this.loadingService.setLoadingStatus(false);
    });
  }

  async deleteMeterData(meterDataItem: IdbUtilityMeterData) {
    await this.utilityMeterDatadbService.deleteWithObservable(meterDataItem.id);
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
}