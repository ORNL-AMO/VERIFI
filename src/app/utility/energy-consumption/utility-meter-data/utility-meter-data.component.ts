import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { listAnimation } from '../../../animations';
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

  itemsPerPage: number = 6;
  tablePageNumbers: Array<number> = [];

  accountMeterDataSub: Subscription;
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
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(() => {
      this.setData();
    });
    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(() => {
      this.setData();
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
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
    this.tablePageNumbers = this.meterList.map(() => {return 1});
  }


  setMeterList() {
    this.meterList = new Array();
    this.utilityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter);
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
    if (this.meterList.length != 0) {
      let findCheckedItem: { idbMeter: IdbUtilityMeter, meterDataItems: Array<IdbUtilityMeterData> } = this.meterList.find(meterItem => {
        return meterItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == true });
      });
      this.hasCheckedItems = (findCheckedItem != undefined);
    }else{
      this.hasCheckedItems = false;
    }
  }

  setDeleteMeterData(meter: IdbUtilityMeterData) {
    this.meterDataToDelete = meter;
  }

  cancelDelete() {
    this.meterDataToDelete = undefined;
    this.meterDataMenuOpen = undefined;
  }

  deleteMeterData() {
    this.utilityMeterDataDbService.deleteIndex(this.meterDataToDelete.id);
    this.cancelDelete();
  }

  setToggleView(idbMeter) {
    idbMeter.visible = !idbMeter.visible
    this.utilityMeterDbService.update(idbMeter);
  }
}
