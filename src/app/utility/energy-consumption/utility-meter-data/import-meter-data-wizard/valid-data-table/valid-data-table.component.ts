import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-valid-data-table',
  templateUrl: './valid-data-table.component.html',
  styleUrls: ['./valid-data-table.component.css']
})
export class ValidDataTableComponent implements OnInit {
  @Input()
  newOrExisting: string;
  @Input()
  dataItems: Array<{ meterName: string, numberOfEntries: number, startDate: Date, endDate: Date }>;

  constructor() { }

  ngOnInit(): void {
  }

}
