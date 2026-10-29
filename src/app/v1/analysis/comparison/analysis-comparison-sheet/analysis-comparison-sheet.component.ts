import { Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceBottomSheetComponent } from '@app/v1/shared/workspace-bottom-sheet/workspace-bottom-sheet.component';
import { AnalysisComparisonOption, AnalysisComparisonSelection, compatibleAnalyses } from '../analysis-comparison-state';

@Component({ selector: 'app-analysis-comparison-sheet', standalone: true, imports: [WorkspaceBottomSheetComponent, ReactiveFormsModule],
  templateUrl: './analysis-comparison-sheet.component.html', styleUrls: ['./analysis-comparison-sheet.component.css'] })
export class AnalysisComparisonSheetComponent {
  readonly options = input.required<readonly AnalysisComparisonOption[]>();
  readonly selection = input.required<AnalysisComparisonSelection>();
  readonly initialFocus = input('[formControlName="first"]');
  readonly notice = input<string>();
  readonly selectionChanged = output<AnalysisComparisonSelection>();
  readonly closed = output<void>();
  readonly form = new FormGroup({ first: new FormControl<string | null>(null), second: new FormControl<string | null>(null) });
  readonly secondOptions = computed(() => {
    const first = this.options().find(option => option.key === this.selection().first);
    return first ? this.options().filter(option => compatibleAnalyses(first, option)) : this.options().filter(option => option.key === this.selection().second);
  });
  readonly complete = computed(() => !!this.selection().first && !!this.selection().second);
  readonly guidance = computed(() => !this.options().length ? 'No analyses are available to compare.'
    : !this.selection().first ? 'Choose Analysis 1 to see compatible analyses.'
      : !this.secondOptions().length ? 'No compatible second analysis is available. Comparisons require the same level and category, and facility analyses must belong to the same facility.'
        : 'Choose Analysis 2 to view the comparison.');
  constructor() {
    effect(() => {
      this.form.patchValue(this.selection(), { emitEvent: false });
      if (!this.selection().first) this.form.controls.second.disable({ emitEvent: false });
      else this.form.controls.second.enable({ emitEvent: false });
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.selectionChanged.emit(this.form.getRawValue()));
  }
}
