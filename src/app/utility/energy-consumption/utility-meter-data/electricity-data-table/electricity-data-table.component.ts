import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db-service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { ElectricityDataFilter, UtilityMeterDataService } from '../utility-meter-data.service';

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


  electricityDataFilters: Array<ElectricityDataFilter>;
  electricityDataFilterSub: Subscription;
  allChecked: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    let hasFalseChecked: IdbUtilityMeterData = this.meterListItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == false });
    this.allChecked = (hasFalseChecked == undefined);
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
      this.utilityMeterDataDbService.update(dataItem);
    })
  }

  toggleChecked(itemIndex: number) {
    this.utilityMeterDataDbService.update(this.meterListItem.meterDataItems[itemIndex]);
  }
}
