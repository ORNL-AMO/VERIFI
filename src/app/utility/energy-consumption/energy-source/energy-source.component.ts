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
      console.log(this.meterList);
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

  meterExport() {
    // const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const allowedHeaders: Array<string> = ["Meter Number", "Account Number", "Source", "Meter Name", "Utility Supplier", "Notes", "Building / Location", "Meter Group", "Collection Unit", "Phase", "Fuel", "Heat Capacity", "Site To Source"];
    let csvData: Array<string> = new Array();
    this.meterList.forEach(meter => {
      let meterCSVData: string = this.getMeterCSVData(meter);
      csvData.push(meterCSVData);
    })
    csvData.unshift(allowedHeaders.join(','));
    let csvBlob: BlobPart = csvData.join('\r\n');

    //Download the file as CSV
    var downloadLink = document.createElement("a");
    var blob = new Blob(["\ufeff", csvBlob]);
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = "VerifiMeterDump.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  getMeterCSVData(meter: IdbUtilityMeter): string {
    let meterCSVItem: string = meter.meterNumber;
    // meterCSVItem = this.addToString(meterCSVItem, meter.meterNumber);
    meterCSVItem = this.addToString(meterCSVItem, meter.accountNumber);
    meterCSVItem = this.addToString(meterCSVItem, meter.source);
    meterCSVItem = this.addToString(meterCSVItem, meter.name);
    meterCSVItem = this.addToString(meterCSVItem, meter.supplier);
    meterCSVItem = this.addToString(meterCSVItem, meter.notes);
    meterCSVItem = this.addToString(meterCSVItem, meter.location);
    meterCSVItem = this.addToString(meterCSVItem, meter.group);
    meterCSVItem = this.addToString(meterCSVItem, meter.startingUnit);
    meterCSVItem = this.addToString(meterCSVItem, meter.phase);
    meterCSVItem = this.addToString(meterCSVItem, meter.fuel);
    meterCSVItem = this.addToString(meterCSVItem, meter.heatCapacity);
    meterCSVItem = this.addToString(meterCSVItem, meter.siteToSource);
    return meterCSVItem;
  }

  addToString(str: string, addition: string | number): string {
    if (addition != undefined) {
      return str + ',' + addition;
    } else {
      return str + ',' + '';
    }
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