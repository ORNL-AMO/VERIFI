import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-electricity-data-table',
  templateUrl: './electricity-data-table.component.html',
  styleUrls: ['./electricity-data-table.component.css', '../utility-meter-data.component.css']
})
export class ElectricityDataTableComponent implements OnInit {
  @Input()
  meterListItem: {
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>,
    errorDate: Date,
    warningDate: Date
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

  supplyDemandCharge: SupplyDemandChargeFilters;
  taxAndOther: TaxAndOtherFilters;
  showTotalDemand: boolean;
  electricityDataFilterSub: Subscription;
  allChecked: boolean;
  energyUnit: string;

  orderDataField: string = 'readDate';
  orderByDirection: string = 'desc';
  constructor(private utilityMeterDataService: UtilityMeterDataService) { }

  ngOnInit(): void {
    this.energyUnit = this.meterListItem.idbMeter.startingUnit;
    if (this.meterListItem.meterDataItems.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.meterListItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }
    this.electricityDataFilterSub = this.utilityMeterDataService.tableElectricityFilters.subscribe(electricityDataFilters => {
      this.taxAndOther = electricityDataFilters.taxAndOther;
      this.supplyDemandCharge = electricityDataFilters.supplyDemandCharge;
      this.showTotalDemand = electricityDataFilters.showTotalDemand;
    });
  }

  ngOnDestroy() {
    this.electricityDataFilterSub.unsubscribe();
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

  checkError(readDate: Date): string {
    let readDateItem: Date = new Date(readDate);
    if (this.meterListItem.errorDate) {
      if (readDateItem.getUTCFullYear() == this.meterListItem.errorDate.getUTCFullYear() && readDateItem.getUTCMonth() == this.meterListItem.errorDate.getUTCMonth() && readDateItem.getUTCDate() == this.meterListItem.errorDate.getUTCDate()) {
        return 'alert-danger';
      }
    }else if(this.meterListItem.warningDate){
      if (readDateItem.getUTCFullYear() == this.meterListItem.warningDate.getUTCFullYear() && readDateItem.getUTCMonth() == this.meterListItem.warningDate.getUTCMonth()) {
        return 'alert-warning';
      }
    }
    return undefined;
  }
}
