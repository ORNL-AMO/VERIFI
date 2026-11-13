import { Component, computed, inject } from '@angular/core';
import { AllSources } from '@data/models/constantsAndTypes';
import { facilityEnergyUseGroupRoute } from '@app/v1/routing/workspace-route';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';
import { facilityEnergyUseFlowOption } from '../energy-use-results-charts';
import { FacilityEnergyUseResultsService } from './facility-energy-use-results.service';

@Component({ selector: 'app-energy-use-facility-footprint', standalone: false,
  templateUrl: './facility-footprint.component.html', styleUrls: ['./facility-footprint.component.css'] })
export class FacilityFootprintComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly facilityResults = inject(FacilityEnergyUseResultsService);
  readonly bills = this.facilityResults.bills;
  readonly facility = computed(() => this.facilityResults.display()?.facility ?? this.facilityResults.facility());
  readonly groups = this.facilityResults.groups;
  readonly items = this.facilityResults.items;
  readonly year = computed(() => this.facilityResults.display()?.year ?? this.facilityResults.year());
  readonly unavailableCalendar = this.facilityResults.unavailableCalendar;
  readonly result = computed(() => this.facilityResults.display()?.result ?? this.facilityResults.result());
  readonly balance = computed(() => this.facilityResults.display()?.balance);
  readonly balanceView = this.balance;
  readonly calculationStatus = this.facilityResults.calculationStatus;
  readonly positive = computed(() => (this.result()?.total ?? 0) > 0 || this.balance()?.sources.some(source => (source.unaccounted ?? 0) > 0));
  readonly option = computed(() => {
    const result = this.result();
    return result ? facilityEnergyUseFlowOption(result, this.facility()!.energyUnit, this.balance()) : { series: [] };
  });
  readonly plotHeight = computed(() => Math.max(360, ((this.result()?.groups.length ?? 0) + (this.balance()?.sources.filter(source => (source.unaccounted ?? 0) > 0).length ?? 0)) * 32 + 100));
  readonly sources = computed(() => {
    const sources = new Map(this.result()?.sources.map(source => [source.source, source]));
    for (const source of this.balance()?.sources ?? []) if (!sources.has(source.source)) sources.set(source.source, { source: source.source, total: 0, partial: false, groups: [] });
    return [...sources.values()].sort((a, b) => a.source.localeCompare(b.source)).map(source => ({ ...source,
    icon: meterSourceIcon(AllSources.find(value => value === source.source) ?? 'Other'),
    groups: source.groups.map(row => ({ ...row, route: [...facilityEnergyUseGroupRoute(row.group.facility.guid, row.group.guid), 'group-footprint'],
      details: row.group.items.flatMap(entry => {
        const sources = row.sources.filter(source => source.itemGuid === entry.guid);
        return sources.length ? [{ guid: entry.guid, name: entry.name, sources }] : [];
      }) })) }));
  });
  readonly withoutSources = computed(() => this.result()?.groups.filter(row => !row.sources.length).map(row => ({ ...row,
    route: [...facilityEnergyUseGroupRoute(row.group.facility.guid, row.group.guid), 'group-summary'] })) ?? []);
}
