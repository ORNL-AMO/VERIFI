import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import { EnergyUseResultsService } from '../energy-use-results.service';

type SummarySortField = 'name' | 'amount' | 'percent';
type SortDirection = 'ascending' | 'descending' | 'none';

@Component({ selector: 'app-energy-use-summary-table', standalone: false,
  templateUrl: './summary-table.component.html', styleUrls: ['./summary-table.component.css'] })
export class SummaryTableComponent {
  readonly results = inject(EnergyUseResultsService);
  readonly displayed = computed(() => this.results.history() ? this.results.annual() : this.results.latest() ? [this.results.latest()!] : []);
  readonly sort = signal<{ field: SummarySortField; year?: number; direction: 1 | -1 }>({ field: 'amount', direction: -1 });
  private readonly sortYear = computed(() => this.displayed().some(result => result.year === this.sort().year)
    ? this.sort().year : this.results.latest()?.year);
  readonly nameSort = computed<SortDirection>(() => this.sort().field === 'name' ? this.sort().direction === 1 ? 'ascending' : 'descending' : 'none');
  readonly columns = computed(() => {
    const sort = this.sort(), year = this.sortYear();
    const direction: SortDirection = sort.direction === 1 ? 'ascending' : 'descending';
    return this.displayed().map(result => ({ ...result,
      amountSort: sort.field === 'amount' && year === result.year ? direction : 'none',
      percentSort: sort.field === 'percent' && year === result.year ? direction : 'none' }));
  });
  readonly rows = computed(() => {
    const annual = this.displayed().map(result => ({ year: result.year, items: new Map(result.items.map(item => [item.projection.item.guid, item])) }));
    const rows = this.results.context.items().map(entry => ({ entry, route: this.results.context.itemRoute(entry.guid),
      icons: [...new Set(entry.item.utilityData.map(source => source.energySource))].map(meterSourceIcon),
      cells: annual.map(result => ({ year: result.year, item: result.items.get(entry.guid) })) }));
    const sort = this.sort(), year = this.sortYear();
    return rows.sort((a, b) => {
      if (sort.field === 'name') return sort.direction * a.entry.name.localeCompare(b.entry.name) || a.entry.guid.localeCompare(b.entry.guid);
      const left = a.cells.find(cell => cell.year === year)?.item?.[sort.field];
      const right = b.cells.find(cell => cell.year === year)?.item?.[sort.field];
      if (left == null || right == null) return left == null && right == null ? a.entry.guid.localeCompare(b.entry.guid) : left == null ? 1 : -1;
      return sort.direction * (left - right) || a.entry.guid.localeCompare(b.entry.guid);
    });
  });

  constructor() {
    effect(() => { this.results.context.key(); untracked(() => this.sort.set({ field: 'amount', direction: -1 })); });
  }
  order(field: SummarySortField, year?: number): void {
    const current = this.sort();
    const same = current.field === field && (field === 'name' || this.sortYear() === year);
    this.sort.set({ field, year, direction: same ? current.direction === 1 ? -1 : 1 : field === 'name' ? 1 : -1 });
  }
}
