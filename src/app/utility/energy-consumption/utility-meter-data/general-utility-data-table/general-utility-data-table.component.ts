import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-general-utility-data-table',
  templateUrl: './general-utility-data-table.component.html',
  styleUrls: ['./general-utility-data-table.component.css']
})
export class GeneralUtilityDataTableComponent implements OnInit {
  @Input()
  meterListItem: {
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>,
    errorDate: Date
  };
  @Input()
  currentPageNumber: number;
  @Input()
  itemsPerPage: number;
  @Input()
  meterIndex: number;
  @Output('setChecked')
  setChecked: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output('setEdit')
  setEdit: EventEmitter<IdbUtilityMeterData> = new EventEmitter<IdbUtilityMeterData>();
  @Output('setDelete')
  setDelete: EventEmitter<IdbUtilityMeterData> = new EventEmitter<IdbUtilityMeterData>();

  allChecked: boolean;
  energyUnit: string;
  volumeUnit: string;
  showVolumeColumn: boolean;
  showEnergyColumn: boolean;
  orderDataField: string = 'readDate';
  orderByDirection: string = 'desc';
  constructor(public utilityMeterDataService: UtilityMeterDataService, private energyUnitsHelperService: EnergyUnitsHelperService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.showVolumeColumn = (this.meterListItem.meterDataItems.find(dataItem => { return dataItem.totalVolume != undefined }) != undefined);
    this.volumeUnit = this.meterListItem.idbMeter.startingUnit;
    this.showEnergyColumn = this.energyUnitsHelperService.isEnergyMeter(this.meterListItem.idbMeter.source);
    if (this.showEnergyColumn) {
      this.energyUnit = this.meterListItem.idbMeter.energyUnit;
    }
    if (this.meterListItem.meterDataItems.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.meterListItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.currentPageNumber && !changes.currentPageNumber.firstChange) {
      this.allChecked = false;
      this.checkAll();
    }
    if (changes.itemsPerPage && !changes.itemsPerPage.firstChange) {
      this.allChecked = false;
      this.checkAll();
    }
  }

  checkAll() {
    if (this.allChecked) {
      this.meterListItem.meterDataItems = _.orderBy(this.meterListItem.meterDataItems, this.orderDataField, this.orderByDirection)
      let displayedItems = this.meterListItem.meterDataItems.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
      displayedItems.forEach(item => {
        item.checked = this.allChecked;
      });
    } else {
      this.meterListItem.meterDataItems.forEach(item => {
        item.checked = false;
      });
    }
    this.setChecked.emit(true);
  }

  toggleChecked() {
    this.setChecked.emit(true);
  }

  setEditMeterData(meterData): void {
    this.setEdit.emit(meterData);
  }

  setDeleteMeterData(meterData): void {
    this.setDelete.emit(meterData);
  }

  setOrderDataField(str: string){
    if(str == this.orderDataField){
      if(this.orderByDirection == 'desc'){
        this.orderByDirection = 'asc';
      }else{
        this.orderByDirection = 'desc';
      }
    }else{
      this.orderDataField = str;
    }
  }

  checkError(readDate: Date): boolean {
    if (this.meterListItem.errorDate) {
      let readDateItem: Date = new Date(readDate);
      if (readDateItem.getUTCFullYear() == this.meterListItem.errorDate.getUTCFullYear() && readDateItem.getUTCMonth() == this.meterListItem.errorDate.getUTCMonth()) {
        return true;
      }
    }
    return false;
  }
}
