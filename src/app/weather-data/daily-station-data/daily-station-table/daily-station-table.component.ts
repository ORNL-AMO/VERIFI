import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-daily-station-table',
  templateUrl: './daily-station-table.component.html',
  styleUrls: ['./daily-station-table.component.css']
})
export class DailyStationTableComponent {
  @Input()
  hourlySummaryData: Array<{ time: Date, degreeDays: number, dryBulbTemp: number, percentOfDay: number, degreeDifference: number }>;
}
