import { Component, computed, input } from '@angular/core';
import { FacilityEmissionFactorsResult } from '@domain/reports/emission-factors/emission-factors-report';
import { emissionFactorsTableView } from '../emission-factors-table.view';

@Component({ selector: 'app-emission-factors-table', standalone: false,
  templateUrl: './emission-factors-table.component.html', styleUrl: './emission-factors-table.component.css' })
export class EmissionFactorsTableComponent {
  readonly result = input.required<FacilityEmissionFactorsResult>();
  readonly category = input<'electricity' | 'other' | 'all'>('all');
  readonly view = computed(() => emissionFactorsTableView(this.result()));
  readonly idPrefix = computed(() => `emission-factors-${this.result().facility.guid}`);
}
