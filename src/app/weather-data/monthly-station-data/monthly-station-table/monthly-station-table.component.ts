import { Component, Input } from '@angular/core';
import { DegreeDay } from 'src/app/models/degreeDays';

@Component({
  selector: 'app-monthly-station-table',
  templateUrl: './monthly-station-table.component.html',
  styleUrls: ['./monthly-station-table.component.css']
})
export class MonthlyStationTableComponent {
  @Input()
  degreeDays: Array<DegreeDay>;
  
}
