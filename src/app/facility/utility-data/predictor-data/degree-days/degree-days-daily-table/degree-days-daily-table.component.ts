import { Component, Input } from '@angular/core';
import { DegreeDay } from 'src/app/models/degreeDays';

@Component({
  selector: 'app-degree-days-daily-table',
  templateUrl: './degree-days-daily-table.component.html',
  styleUrls: ['./degree-days-daily-table.component.css']
})
export class DegreeDaysDailyTableComponent {
  @Input()
  degreeDays: Array<DegreeDay>;

}
