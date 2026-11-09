import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { energyUseChartYears, projectEnergyUse, savedEnergyUseYears } from '../../models/energy-use-projection.models';
import { energyUseHistoryOption } from './energy-use-history.models';

@Component({ selector: 'app-energy-use-history', standalone: false, templateUrl: './energy-use-history.component.html', styleUrls: ['./energy-use-history.component.css'] })
export class EnergyUseHistoryComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly store = inject(AccountWorkspaceStore);
  readonly unit = computed(() => this.context.entry()?.facility.energyUnit ?? '');
  readonly rows = computed(() => {
    const entry = this.context.entry(); if (!entry) return [];
    const ownYears = savedEnergyUseYears([entry.item]); if (!ownYears.length) return [];
    return energyUseChartYears(this.store.energyUseEquipment()).filter(year => year >= ownYears[0]).flatMap(year => {
      const row = projectEnergyUse(entry.item, entry.facility, year, this.unit()); return row ? [row] : [];
    });
  });
  readonly details = computed(() => this.rows().flatMap(row => row.sources.map(source => ({ ...source, period: row.period.label }))));
  readonly option = computed(() => energyUseHistoryOption(this.rows(), this.unit()));
}
