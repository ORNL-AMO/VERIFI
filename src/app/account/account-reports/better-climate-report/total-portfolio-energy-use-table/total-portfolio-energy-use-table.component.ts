import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';

@Component({
  selector: 'app-total-portfolio-energy-use-table',
  templateUrl: './total-portfolio-energy-use-table.component.html',
  styleUrls: ['./total-portfolio-energy-use-table.component.css']
})
export class TotalPortfolioEnergyUseTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
}
