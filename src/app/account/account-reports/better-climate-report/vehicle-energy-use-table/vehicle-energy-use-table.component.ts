import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-vehicle-energy-use-table',
  templateUrl: './vehicle-energy-use-table.component.html',
  styleUrls: ['./vehicle-energy-use-table.component.css'],
  standalone: false
})
export class VehicleEnergyUseTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;

}
