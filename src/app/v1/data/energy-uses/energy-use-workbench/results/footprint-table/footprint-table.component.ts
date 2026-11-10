import { Component, computed, inject } from '@angular/core';
import { AllSources } from '@data/models/constantsAndTypes';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { energyUseSourceBreakdown } from '../../../models/energy-use-results.models';
import { EnergyUseResultsService } from '../energy-use-results.service';

@Component({ selector: 'app-energy-use-footprint-table', standalone: false,
  templateUrl: './footprint-table.component.html', styleUrls: ['./footprint-table.component.css'] })
export class FootprintTableComponent {
  readonly results = inject(EnergyUseResultsService);
  readonly groups = computed(() => {
    const selected = this.results.latest();
    return selected ? energyUseSourceBreakdown(selected).map(group => ({ ...group,
      icon: meterSourceIcon(AllSources.find(source => source === group.source) ?? 'Other'),
      items: group.items.map(row => ({ ...row, route: this.results.context.itemRoute(row.item.guid) })) })) : [];
  });
}
