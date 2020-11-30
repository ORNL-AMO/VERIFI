import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

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

  allChecked: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    let hasFalseChecked: IdbUtilityMeterData = this.meterListItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == false });
    this.allChecked = (hasFalseChecked == undefined);
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
