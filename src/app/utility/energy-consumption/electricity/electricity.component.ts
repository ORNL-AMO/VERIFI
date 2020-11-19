import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { UtilityService } from "../../../utility/utility.service";
import { listAnimation } from '../../../animations';
import { EnergyConsumptionService } from "../energy-consumption.service";
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db-service';
import { Subscription } from 'rxjs';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db-service';

@Component({
  selector: 'app-electricity',
  templateUrl: './electricity.component.html',
  styleUrls: ['./electricity.component.css'],
  animations: [
    listAnimation
  ]
})


export class ElectricityComponent implements OnInit {
  @ViewChildren("masterCheckbox") masterCheckbox: QueryList<ElementRef>;
  @ViewChild('inputFile') myInputVariable: ElementRef;

  meterList: Array<{
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>
  }>;

  page: Array<number> = [];
  itemsPerPage: number = 6;
  pageSize: Array<number> = [];

  filterColMenu: boolean = false;
  filterCol = [
    { id: 0, filter: true, name: 'filterColBasicCharge', display: 'Basic Charge' },
    { id: 1, filter: false, name: 'filterColSupplyBlockAmt', display: 'Supply Block Amt' },
    { id: 2, filter: false, name: 'filterColSupplyBlockCharge', display: 'Supply Block Charge' },
    { id: 3, filter: false, name: 'filterColFlatRateAmt', display: 'Flat Rate Amt' },
    { id: 4, filter: false, name: 'filterColFlatRateCharge', display: 'Flat Rate Charge' },
    { id: 5, filter: false, name: 'filterColPeakAmt', display: 'Peak Amt' },
    { id: 6, filter: false, name: 'filterColPeakCharge', display: 'Peak Charge' },
    { id: 7, filter: false, name: 'filterColOffpeakAmt', display: 'Off-Peak Amt' },
    { id: 8, filter: false, name: 'filterColOffpeakCharge', display: 'Off-Peak Charge' },
    { id: 9, filter: false, name: 'filterColDemandBlockAmt', display: 'Demand Block Amt' },
    { id: 10, filter: false, name: 'filterColDemandBlockCharge', display: 'Demand Block Charge' },
    { id: 11, filter: false, name: 'filterColGenTransCharge', display: 'Generation and Transmission Charge' },
    { id: 12, filter: true, name: 'filterColDeliveryCharge', display: 'Delivery Charge' },
    { id: 13, filter: false, name: 'filterColTransCharge', display: 'Transmission Charge' },
    { id: 14, filter: false, name: 'filterColPowerFactorCharge', display: 'Power Factor Charge' },
    { id: 15, filter: false, name: 'filterColBusinessCharge', display: 'Local Business Charge' },
    { id: 16, filter: true, name: 'filterColUtilityTax', display: 'Utility Tax' },
    { id: 17, filter: true, name: 'filterColLatePayment', display: 'Late Payment' },
    { id: 18, filter: true, name: 'filterColOtherCharge', display: 'Other Charge' }
  ];


  meterListSub: Subscription;
  facilityMetersSub: Subscription;
  editMeterData: IdbUtilityMeterData;
  utilityMeters: Array<IdbUtilityMeter>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  meterDataMenuOpen: number;
  showImport: boolean;
  addOrEdit: string;
  constructor(
    public energyConsumptionService: EnergyConsumptionService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.utilityMeters = facilityMeters.filter(meter => { return meter.source == "Electricity" });
      this.setMeterList();
      this.setMeterPages();
      this.changePagesize(this.itemsPerPage);
    });


    this.meterListSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(() => {
      this.setMeterList();
      this.setMeterPages();
      this.changePagesize(this.itemsPerPage);
    });
  }

  ngOnDestroy() {
    this.meterListSub.unsubscribe();
    this.facilityMetersSub.unsubscribe();
  }

  setMeterList() {
    this.meterList = new Array();
    this.utilityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.energyConsumptionService.getMeterData(meter.id);
      this.meterList.push({
        idbMeter: meter,
        meterDataItems: meterData
      });
    });
  }



  showAllColumns() {
    for (let i = 0; i < this.filterCol.length; i++) {
      this.filterCol[i].filter = true;
    }
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
  }

  setMeterPages() {
    for (let i = 0; i < this.meterList.length; i++) {
      this.page.push(1);
      this.pageSize.push(1);
    }
  }

  public onPageChange(index, pageNum: number): void {
    this.pageSize[index] = this.itemsPerPage * (pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    for (let i = 0; i < this.meterList.length; i++) {
      this.onPageChange(i, this.page[i]);
    }
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    this.addOrEdit = 'edit';
    this.editMeterData = meterData;
  }

  cancelEditMeter() {
    this.editMeterData = undefined;
    this.meterDataMenuOpen = undefined;
  }

  meterDataToggleMenu(meterId: number) {
    this.meterDataMenuOpen = meterId;
  }

  openImportModal() {
    this.showImport = true;
  }

  closeImportModal() {
    this.showImport = false;
    this.meterDataMenuOpen = undefined;
  }

  meterExport() {

  }

  bulkDelete() {

  }

  meterDataAdd(meter: IdbUtilityMeter) {
    this.addOrEdit = 'add';
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter.id, meter.facilityId, meter.accountId);
  }

  checkAll(){

  }
}
