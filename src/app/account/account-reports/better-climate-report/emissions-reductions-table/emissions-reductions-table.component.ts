import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateReport';

@Component({
  selector: 'app-emissions-reductions-table',
  templateUrl: './emissions-reductions-table.component.html',
  styleUrls: ['./emissions-reductions-table.component.css']
})
export class EmissionsReductionsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;

}
