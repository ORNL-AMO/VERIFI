import { Component, input, output } from '@angular/core';
import { PortfolioFacilityView } from '../portfolio-facility.view';

@Component({
  selector: 'app-facility-directory',
  templateUrl: './facility-directory.component.html',
  styleUrls: ['./facility-directory.component.css'],
  standalone: false
})
export class FacilityDirectoryComponent {
  readonly facilities = input<readonly PortfolioFacilityView[]>([]);
  readonly singleColumn = input(false);
  readonly openFacility = output<string>();
}
