import { Component, inject } from '@angular/core';
import { FacilityEnergyUseResultsService } from '../results/facility-footprint/facility-energy-use-results.service';

@Component({ selector: 'app-energy-use-balance-facts', standalone: false,
  templateUrl: './balance-facts.component.html', styleUrls: ['./balance-facts.component.css'] })
export class BalanceFactsComponent {
  readonly results = inject(FacilityEnergyUseResultsService);
}
