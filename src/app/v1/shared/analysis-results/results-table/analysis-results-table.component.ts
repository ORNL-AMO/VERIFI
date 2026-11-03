import { Component, ElementRef, ViewChild, computed, input, signal } from '@angular/core';
import { AnalysisResultsTableColumn, AnalysisResultsTableView } from './analysis-results-table.models';

@Component({
  selector: 'app-analysis-results-table', standalone: false,
  templateUrl: './analysis-results-table.component.html', styleUrls: ['./analysis-results-table.component.css']
})
export class AnalysisResultsTableComponent {
  readonly view = input.required<AnalysisResultsTableView>();
  readonly period = input.required<'annual' | 'monthly'>();
  readonly caption = input.required<string>();
  readonly unit = input<string>();
  readonly category = input<'energy' | 'water'>('energy');
  readonly showCaption = input(false);
  readonly copying = input(false);
  readonly emphasizeNegative = input(false);
  readonly hoveredColumn = signal<AnalysisResultsTableColumn | undefined>(undefined);
  readonly periodColumn = computed<AnalysisResultsTableColumn>(() => ({ id: 'period', label: this.period() === 'annual' ? 'Year' : 'Month', section: 'period' }));
  readonly activeHover = computed(() => this.hoveredColumn()?.id === 'period' ? this.periodColumn()
    : this.view().headers.find(column => column.id === this.hoveredColumn()?.id));
  readonly periodColumnCount = computed(() => 1 + this.view().headers.filter(column => column.section === 'period').length);
  readonly sections = computed(() => (['use', 'predictors', 'improvement'] as const).flatMap(section => {
    const count = this.view().headers.filter(column => column.section === section).length;
    return count ? [{ id: section, count, label: section === 'use' ? this.category() === 'water' ? 'Consumption' : 'Energy'
      : section === 'predictors' ? 'Production Variables' : 'Incremental Improvement' }] : [];
  }));
  @ViewChild('resultsTable') table?: ElementRef<HTMLTableElement>;
}
