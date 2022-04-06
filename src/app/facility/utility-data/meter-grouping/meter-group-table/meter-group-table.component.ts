import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbUtilityMeterGroup } from 'src/app/models/idb';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';

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
  @ViewChild('meterGroupTable', { static: false }) meterGroupTable: ElementRef;



  constructor(private copyTableService: CopyTableService) { }

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


  copyTable(){
    this.copyTableService.copyTable(this.meterGroupTable);
  }
}
