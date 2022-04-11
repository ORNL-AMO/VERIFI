import { Component, Input, OnInit } from '@angular/core';
import { CalanderizedMeter } from 'src/app/models/calanderization';

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

  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  constructor() { }

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

}
