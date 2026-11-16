import { Component, computed, input, signal } from '@angular/core';
import { DataQualityAnnualTotal, DataQualityAnnualTotals } from '@domain/reports/data-quality-report-annual-totals';
import { dataQualityAnnualColumns, dataQualityAnnualRows } from './data-quality-annual-totals.view';

@Component({
  selector: 'app-data-quality-annual-totals', standalone: false,
  templateUrl: './data-quality-annual-totals.component.html',
  styleUrls: ['./data-quality-annual-totals.component.css']
})
export class DataQualityAnnualTotalsComponent {
  readonly totals = input.required<DataQualityAnnualTotals>();
  readonly idPrefix = input.required<string>();
  private readonly order = signal<{ key: keyof DataQualityAnnualTotal; descending: boolean }>({ key: 'year', descending: false });
  readonly columns = computed(() => dataQualityAnnualColumns(this.totals()).map(column => ({ ...column,
    sort: this.order().key === column.key ? this.order().descending ? 'descending' : 'ascending' : 'none',
    direction: this.order().key === column.key ? this.order().descending ? '↓' : '↑' : ''
  })));
  readonly rows = computed(() => {
    const { key, descending } = this.order();
    const totals = this.totals();
    return dataQualityAnnualRows(totals.columns,
      [...totals.rows].sort((a, b) => (a[key] - b[key]) * (descending ? -1 : 1)));
  });
  sort(key: keyof DataQualityAnnualTotal): void {
    this.order.update(order => ({ key, descending: order.key === key ? !order.descending : order.descending }));
  }
}
