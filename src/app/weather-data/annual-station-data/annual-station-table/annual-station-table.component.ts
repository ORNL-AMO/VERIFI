import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-annual-station-table',
  templateUrl: './annual-station-table.component.html',
  styleUrls: ['./annual-station-table.component.css']
})
export class AnnualStationTableComponent {
  @Input()
  yearSummaryData: Array<{ date: Date, amount: number }>;
  
  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
}
