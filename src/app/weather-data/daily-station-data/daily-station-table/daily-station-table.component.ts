import { Component, Input } from '@angular/core';
import { DetailDegreeDay } from 'src/app/models/degreeDays';

@Component({
  selector: 'app-daily-station-table',
  templateUrl: './daily-station-table.component.html',
  styleUrls: ['./daily-station-table.component.css']
})
export class DailyStationTableComponent {
  @Input()
  hourlySummaryData: Array<DetailDegreeDay>;
}
