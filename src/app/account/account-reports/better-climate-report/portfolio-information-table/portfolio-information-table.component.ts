import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';

@Component({
  selector: 'app-portfolio-information-table',
  templateUrl: './portfolio-information-table.component.html',
  styleUrls: ['./portfolio-information-table.component.css']
})
export class PortfolioInformationTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;

}
