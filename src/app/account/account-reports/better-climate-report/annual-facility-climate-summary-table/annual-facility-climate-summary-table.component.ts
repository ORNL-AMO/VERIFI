import { Component, Input } from '@angular/core';
import { BetterClimateFacility } from 'src/app/calculations/carbon-calculations/betterClimateFacility';

@Component({
  selector: 'app-annual-facility-climate-summary-table',
  templateUrl: './annual-facility-climate-summary-table.component.html',
  styleUrls: ['./annual-facility-climate-summary-table.component.css']
})
export class AnnualFacilityClimateSummaryTableComponent {
  @Input()
  annualFacilitySummary: {
    betterClimateFacilities: Array<BetterClimateFacility>,
    year: number
  };
}
