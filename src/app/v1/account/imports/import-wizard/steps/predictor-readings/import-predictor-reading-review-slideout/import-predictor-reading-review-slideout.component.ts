import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ImportPredictorReadingRow } from '../../../import-predictor-review-state.service';
import {
  importComparisonAriaSort,
  ImportComparisonSortDirection,
  ImportComparisonValueField,
  sortImportReadingComparisons
} from '../../../import-reading-comparison-sort';

export type ImportPredictorReadingReviewMode = 'comparisons' | 'invalid';
type ComparisonSortField = 'month' | ImportComparisonValueField;
const COMPARISON_SORT_FIELDS: readonly ComparisonSortField[] =
  ['month', 'current', 'imported', 'difference', 'percentage'];

@Component({
  selector: 'app-import-predictor-reading-review-slideout',
  standalone: true,
  imports: [CommonModule, WorkspaceSlideoutComponent],
  templateUrl: './import-predictor-reading-review-slideout.component.html',
  styleUrls: ['./import-predictor-reading-review-slideout.component.css']
})
export class ImportPredictorReadingReviewSlideoutComponent {
  readonly row = input.required<ImportPredictorReadingRow>();
  readonly mode = input.required<ImportPredictorReadingReviewMode>();
  readonly closed = output<void>();
  readonly exclusionChanged = output<{ index: number; excluded: boolean }>();

  readonly sortField = signal<ComparisonSortField>('month');
  readonly sortDirection = signal<ImportComparisonSortDirection>('desc');
  readonly title = computed(() => this.mode() === 'comparisons'
    ? `Compare predictor readings: ${this.row().predictor.name}`
    : `Review invalid readings: ${this.row().predictor.name}`);
  readonly description = computed(() => this.mode() === 'comparisons'
    ? 'Compare uploaded values with the readings currently saved for the same months.'
    : 'Invalid readings must be excluded before this upload can continue.');
  readonly ariaSort = computed(() => importComparisonAriaSort(
    COMPARISON_SORT_FIELDS, this.sortField(), this.sortDirection()));
  readonly sortedComparisons = computed(() => sortImportReadingComparisons(
    this.row().comparisons,
    this.sortField(),
    'month',
    comparison => comparison.readMonth.getTime(),
    this.sortDirection()
  ));

  changeSort(field: ComparisonSortField): void {
    if (field === this.sortField()) {
      this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortField.set(field);
    this.sortDirection.set(field === 'month' ? 'desc' : 'asc');
  }
}
