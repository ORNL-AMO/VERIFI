import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { listAnimation } from '../../../animations';
import { EnergyConsumptionService } from "../energy-consumption.service";
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Subscription } from 'rxjs';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ActivatedRoute } from '@angular/router';
import { UtilityMeterDataService } from './utility-meter-data.service';

@Component({
  selector: 'app-utility-meter-data',
  templateUrl: './utility-meter-data.component.html',
  styleUrls: ['./utility-meter-data.component.css'],
  animations: [
    listAnimation
  ]
})
export class UtilityMeterDataComponent implements OnInit {

  @ViewChildren("masterCheckbox") masterCheckbox: QueryList<ElementRef>;
  @ViewChild('inputFile') myInputVariable: ElementRef;

  meterList: Array<{
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>
  }>;

  page: Array<number> = [];
  itemsPerPage: number = 6;
  pageSize: Array<number> = [];

  meterListSub: Subscription;
  facilityMetersSub: Subscription;
  editMeterData: IdbUtilityMeterData;
  utilityMeters: Array<IdbUtilityMeter>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  meterDataMenuOpen: number;
  showImport: boolean;
  addOrEdit: string;
  selectedSource: string;
  hasCheckedItems: boolean;
  meterDataToDelete: IdbUtilityMeterData;
  constructor(
    public energyConsumptionService: EnergyConsumptionService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private activatedRoute: ActivatedRoute,
    private utilityMeterDataService: UtilityMeterDataService
  ) { }

  ngOnInit() {
    this.activatedRoute.url.subscribe(url => {
      this.setUtilitySource(url[0].path);
      this.setData();
    })
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.setData();
    });
    this.meterListSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(() => {
      this.setData();
    });
  }

  ngOnDestroy() {
    this.meterListSub.unsubscribe();
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
    this.setMeterPages();
    this.changePagesize(this.itemsPerPage);
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
    this.setHasCheckedItems();
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
    this.utilityMeterDataService.meterExport(this.meterList, this.selectedSource);
  }

  bulkDelete() {
    let meterDataItemsToDelete: Array<IdbUtilityMeterData> = new Array();
    this.meterList.forEach(meterListItem => {
      meterListItem.meterDataItems.forEach(meterDataItem => {
        if (meterDataItem.checked) {
          meterDataItemsToDelete.push(meterDataItem);
        }
      })
    });
    meterDataItemsToDelete.forEach(meterItemToDelete => { this.utilityMeterDataDbService.deleteIndex(meterItemToDelete.id) });
  }

  meterDataAdd(meter: IdbUtilityMeter) {
    this.addOrEdit = 'add';
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter.id, meter.facilityId, meter.accountId);
  }

  setHasCheckedItems() {
    let findCheckedItem: { idbMeter: IdbUtilityMeter, meterDataItems: Array<IdbUtilityMeterData> } = this.meterList.find(meterItem => {
      return meterItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == true });
    });
    this.hasCheckedItems = (findCheckedItem != undefined);
  }

  setDeleteMeterData(meter: IdbUtilityMeterData){
    this.meterDataToDelete = meter;
  }

  cancelDelete(){
    this.meterDataToDelete = undefined;
    this.meterDataMenuOpen = undefined;
  }

  deleteMeterData(){
    this.utilityMeterDataDbService.deleteIndex(this.meterDataToDelete.id);
    this.cancelDelete();
  }
}
