import { Component, DestroyRef, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AnalysisTableColumns } from '@data/models/analysis';
import { distinctUntilChanged } from 'rxjs';
import { FacilityAnalysisResultsDisplayService } from '../facility-analysis-results-display.service';

export interface AnalysisResultColumnOption {
  readonly id: keyof AnalysisTableColumns;
  readonly label: string;
}

@Component({
  selector: 'app-analysis-result-column-chooser',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <details>
      <summary class="v1-btn v1-btn--secondary">Choose columns</summary>
      <div class="v1-analysis-results__column-menu">
        @for (option of options(); track option.id) {
          <label><input type="checkbox" [formControl]="control(option.id)" /> {{ option.label }}</label>
        }
      </div>
    </details>
  `
})
export class AnalysisResultColumnChooserComponent {
  readonly options = input.required<readonly AnalysisResultColumnOption[]>();
  private readonly display = inject(FacilityAnalysisResultsDisplayService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly controls = new Map<keyof AnalysisTableColumns, FormControl<boolean>>();
  private syncing = false;

  constructor() {
    effect(() => {
      const columns = this.display.columns();
      this.syncing = true;
      for (const option of this.options()) this.control(option.id).setValue(columns[option.id] === true, { emitEvent: false });
      this.syncing = false;
    });
  }

  control(column: keyof AnalysisTableColumns): FormControl<boolean> {
    let control = this.controls.get(column);
    if (!control) {
      control = new FormControl(false, { nonNullable: true });
      control.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(visible => { if (!this.syncing) this.display.setColumn(column, visible); });
      this.controls.set(column, control);
    }
    return control;
  }
}
