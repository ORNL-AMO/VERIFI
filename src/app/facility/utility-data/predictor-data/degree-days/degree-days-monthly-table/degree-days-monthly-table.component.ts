import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-degree-days-monthly-table',
  templateUrl: './degree-days-monthly-table.component.html',
  styleUrls: ['./degree-days-monthly-table.component.css']
})
export class DegreeDaysMonthlyTableComponent {
  @Input()
  yearSummaryData: Array<{ date: Date, amount: number }>;
  
  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
}
