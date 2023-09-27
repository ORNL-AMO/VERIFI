import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';

@Component({
  selector: 'app-vehicle-energy-use-table',
  templateUrl: './vehicle-energy-use-table.component.html',
  styleUrls: ['./vehicle-energy-use-table.component.css']
})
export class VehicleEnergyUseTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;

}
