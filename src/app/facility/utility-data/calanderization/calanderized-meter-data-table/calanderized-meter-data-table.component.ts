import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';

@Component({
  selector: 'app-calanderized-meter-data-table',
  templateUrl: './calanderized-meter-data-table.component.html',
  styleUrls: ['./calanderized-meter-data-table.component.css']
})
export class CalanderizedMeterDataTableComponent implements OnInit {
  @Input()
  calanderizedMeter: CalanderizedMeter;
  @Input()
  itemsPerPage: number;

  @ViewChild('meterDataTable', { static: false }) meterDataTable: ElementRef;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  copyingTable: boolean = false
  constructor(private copyTableService: CopyTableService) { }

  ngOnInit(): void {
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
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterDataTable);
      this.copyingTable = false;
    }, 200)
  }
}
