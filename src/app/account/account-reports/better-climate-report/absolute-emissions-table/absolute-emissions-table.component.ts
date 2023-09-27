import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateReport';

@Component({
  selector: 'app-absolute-emissions-table',
  templateUrl: './absolute-emissions-table.component.html',
  styleUrls: ['./absolute-emissions-table.component.css']
})
export class AbsoluteEmissionsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;

}
