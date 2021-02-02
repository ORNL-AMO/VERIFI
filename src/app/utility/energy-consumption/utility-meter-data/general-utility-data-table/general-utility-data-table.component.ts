import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-general-utility-data-table',
  templateUrl: './general-utility-data-table.component.html',
  styleUrls: ['./general-utility-data-table.component.css']
})
export class GeneralUtilityDataTableComponent implements OnInit {
  @Input()
  meterListItem: {
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>
  };
  @Input()
  pageSize: Array<number>;
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
  constructor(public utilityMeterDataService: UtilityMeterDataService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

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

  checkAll() {
    this.meterListItem.meterDataItems.forEach(dataItem => {
      dataItem.checked = this.allChecked;
    });
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
}
