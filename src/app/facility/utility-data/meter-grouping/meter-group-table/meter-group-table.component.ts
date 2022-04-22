import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-meter-group-table',
  templateUrl: './meter-group-table.component.html',
  styleUrls: ['./meter-group-table.component.css']
})
export class MeterGroupTableComponent implements OnInit {
  @Input()
  meterGroupType: MeterGroupType;
  @Input()
  meterGroup: IdbUtilityMeterGroup;
  @Input()
  itemsPerPage: number;
  @Input()
  index: number;
  @Input()
  energyUnit: string;
  @Input()
  waterUnit: string;

  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  tablePageNumbers: Array<number>;
  consumptionUnit: string;
  constructor() { }

  ngOnInit(): void {
    if (this.meterGroup.combinedMonthlyData) {
      this.tablePageNumbers = this.meterGroup.combinedMonthlyData.map(() => { return 1 });
    }
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
