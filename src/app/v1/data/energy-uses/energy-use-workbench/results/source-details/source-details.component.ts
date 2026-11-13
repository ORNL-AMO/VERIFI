import { Component, computed, input } from '@angular/core';
import { ProjectedConsumption } from '../../../models/energy-use-projection.models';

@Component({ selector: 'app-energy-use-source-details', standalone: false,
  templateUrl: './source-details.component.html', styleUrls: ['./source-details.component.css'] })
export class SourceDetailsComponent {
  readonly sources = input.required<readonly ProjectedConsumption[]>();
  readonly rows = computed(() => this.sources().map(source => ({ ...source,
    savedAmount: source.originalAmount === undefined ? '' : Number.isFinite(source.originalAmount)
      ? source.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'Invalid value' })));
}
