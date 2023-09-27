import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';

@Component({
  selector: 'app-graph-calculations-table',
  templateUrl: './graph-calculations-table.component.html',
  styleUrls: ['./graph-calculations-table.component.css']
})
export class GraphCalculationsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;

}
