import { Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReportAnalysisSelectionCard } from './report-analysis-selection.models';

/** Report adapters own eligible choices and saving; this view owns browsing and selection presentation. */
@Component({ selector: 'app-report-analysis-selection', standalone: false,
  templateUrl: './report-analysis-selection.component.html', styleUrls: ['./report-analysis-selection.component.css'] })
export class ReportAnalysisSelectionComponent {
  readonly cards = input.required<readonly ReportAnalysisSelectionCard[]>();
  readonly selectionControl = input.required<FormControl<string | null>>();
  readonly selectedValue = input.required<string | null>();
  readonly resetKey = input.required<string>();
  readonly idPrefix = input.required<string>();
  readonly canEdit = input(true);
  readonly showTypeFilter = input(false);
  readonly showInspection = input(true);
  readonly emptyMessage = input('No eligible analyses are available. Create an analysis before continuing to data checks.');
  readonly inspected = output<string>();
  readonly form = new FormGroup({
    category: new FormControl<'all' | 'energy' | 'water'>('all', { nonNullable: true }),
    baselineYear: new FormControl<number | null>(null)
  });
  private readonly changes = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly filters = computed(() => ({
    category: this.showTypeFilter() ? this.changes().category ?? 'all' : 'all', baselineYear: this.changes().baselineYear ?? null
  }));
  readonly ids = computed(() => ({ selection: `${this.idPrefix()}-analysis`, heading: `${this.idPrefix()}-analysis-title`,
    type: `${this.idPrefix()}-analysis-type`, baseline: `${this.idPrefix()}-analysis-baseline` }));
  readonly baselineYears = computed(() => [...new Set(this.cards().flatMap(card =>
    Number.isInteger(card.baselineYear) ? [card.baselineYear!] : []))].sort((a, b) => b - a));
  readonly filteredCards = computed(() => {
    const filters = this.filters();
    return this.cards().filter(card => (filters.category === 'all' || card.categoryValue === filters.category)
      && (filters.baselineYear === null || card.baselineYear === filters.baselineYear));
  });
  readonly filtersActive = computed(() => this.filters().category !== 'all' || this.filters().baselineYear !== null);
  readonly hiddenSelection = computed(() => {
    const selected = this.cards().find(card => card.value === this.selectedValue());
    return selected && !this.filteredCards().some(card => card.value === selected.value) ? selected : undefined;
  });
  constructor() { effect(() => { this.resetKey(); this.clearFilters(); }); }
  clearFilters(): void { this.form.reset({ category: 'all', baselineYear: null }); }
}
