import { Component, inject } from '@angular/core';
import { EnergyUseResultsService } from '../energy-use-results.service';

@Component({ selector: 'app-energy-use-results-controls', standalone: false,
  templateUrl: './results-controls.component.html', styleUrls: ['./results-controls.component.css'] })
export class ResultsControlsComponent {
  readonly results = inject(EnergyUseResultsService);
}
