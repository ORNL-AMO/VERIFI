import { Component, input, output } from '@angular/core';
import { PortfolioMeterFacilityGroup } from '../portfolio-meter.view';

@Component({
  selector: 'app-meter-facility-group',
  templateUrl: './meter-facility-group.component.html',
  styleUrls: ['./meter-facility-group.component.css'],
  standalone: false
})
export class MeterFacilityGroupComponent {
  readonly group = input.required<PortfolioMeterFacilityGroup>();
  readonly facilityRoute = input.required<readonly string[]>();
  readonly wide = input(false);
  readonly openMeter = output<string>();
}
