import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { ElectricityDataFilter } from 'src/app/models/electricityFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-electricity-data-table',
  templateUrl: './electricity-data-table.component.html',
  styleUrls: ['./electricity-data-table.component.css', '../utility-meter-data.component.css']
})
export class ElectricityDataTableComponent implements OnInit {
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

  electricityDataFilters: Array<ElectricityDataFilter>;
  electricityDataFilterSub: Subscription;
  allChecked: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService) { }

  ngOnInit(): void {
    if (this.meterListItem.meterDataItems.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.meterListItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }
    this.electricityDataFilterSub = this.utilityMeterDataService.electricityDataFilters.subscribe(electricityDataFilters => {
      this.electricityDataFilters = electricityDataFilters;
    });
  }

  ngOnDestroy() {
    this.electricityDataFilterSub.unsubscribe();
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
}
