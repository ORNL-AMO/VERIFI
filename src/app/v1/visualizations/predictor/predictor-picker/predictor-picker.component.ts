import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { PredictorResourceChoice } from '../predictor-items';

@Component({ selector: 'app-visualization-predictor-picker', standalone: false,
  templateUrl: './predictor-picker.component.html', styleUrls: ['../../../shared/creation-flow/creation-flow.css', './predictor-picker.component.css'] })
export class PredictorPickerComponent {
  readonly choices = input<readonly PredictorResourceChoice[]>([]);
  readonly selected = input<readonly string[]>([]);
  readonly disabled = input(false);
  readonly allMode = input(false);
  readonly allRequested = output<void>();
  readonly selectionRequested = output<string>();
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = signal('');
  readonly configured = computed<readonly PredictorResourceChoice[]>(() => {
    const choices = this.choices(), available = new Set(choices.map(choice => choice.value));
    return this.allMode() ? choices : [...choices, ...this.selected().filter(guid => !available.has(guid)).map(guid => ({
      value: guid, label: 'Unavailable predictor', detail: `Saved selection · ${guid}`,
      cardDetail: 'Remove this unavailable selection', icon: 'predictor' as const, available: false
    }))];
  });
  readonly showSearch = computed(() => this.configured().length > 8 || !!this.query());
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.configured().filter(choice => `${choice.label} ${choice.detail}`.toLocaleLowerCase().includes(query));
  });
  constructor() {
    this.search.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(value => this.query.set(value));
  }
}
