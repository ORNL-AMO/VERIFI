import { Component, computed, input, signal } from '@angular/core';
import { DataQualityAnnualTotal, DataQualityAnnualTotals } from '@domain/reports/data-quality-report-annual-totals';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';

@Component({
  selector: 'app-data-quality-annual-totals', standalone: false,
  templateUrl: './data-quality-annual-totals.component.html',
  styleUrls: ['./data-quality-annual-totals.component.css']
})
export class DataQualityAnnualTotalsComponent {
  readonly totals = input.required<DataQualityAnnualTotals>();
  readonly idPrefix = input.required<string>();
  private readonly order = signal<{ key: keyof DataQualityAnnualTotal; descending: boolean }>({ key: 'year', descending: false });
  private readonly number = new AnalysisResultNumberPipe();
  readonly columns = computed(() => this.totals().columns.map(column => ({ ...column,
    unitHtml: column.unit ? new ConvertValue(undefined, undefined, undefined).getUnit(column.unit)?.unit.name.display.replace('(', '').replace(')', '') : undefined,
    sort: this.order().key === column.key ? this.order().descending ? 'descending' : 'ascending' : 'none',
    direction: this.order().key === column.key ? this.order().descending ? '↓' : '↑' : ''
  })));
  readonly rows = computed(() => {
    const { key, descending } = this.order();
    return [...this.totals().rows].sort((a, b) => (a[key] - b[key]) * (descending ? -1 : 1))
      .map(row => ({ year: row.year, cells: this.totals().columns.map(column => {
        const value = row[column.key];
        const text = column.key === 'year' ? String(value) : Number.isFinite(value) ? this.number.transform(value) : value.toLocaleString();
        return { key: column.key, text: column.key === 'energyCost' ? `$${text}` : text };
      }) }));
  });
  sort(key: keyof DataQualityAnnualTotal): void {
    this.order.update(order => ({ key, descending: order.key === key ? !order.descending : order.descending }));
  }
}
