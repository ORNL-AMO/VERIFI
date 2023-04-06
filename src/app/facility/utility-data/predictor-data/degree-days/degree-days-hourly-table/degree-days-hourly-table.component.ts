import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-degree-days-hourly-table',
  templateUrl: './degree-days-hourly-table.component.html',
  styleUrls: ['./degree-days-hourly-table.component.css']
})
export class DegreeDaysHourlyTableComponent {
  @Input()
  hourlySummaryData: Array<{ time: Date, degreeDays: number, dryBulbTemp: number, percentOfDay: number, degreeDifference: number }>;


  
}
