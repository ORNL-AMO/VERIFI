import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { ImportPredictorReadingComparison } from '@data/import/predictor-reading-import-review';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ImportPredictorReadingRow } from '../../../import-predictor-review-state.service';

export type ImportPredictorReadingReviewMode = 'comparisons' | 'invalid';
type ComparisonSortField = 'month' | 'current' | 'imported' | 'difference' | 'percentage';
type SortDirection = 'asc' | 'desc';

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
  readonly sortDirection = signal<SortDirection>('desc');
  readonly title = computed(() => this.mode() === 'comparisons'
    ? `Compare predictor readings: ${this.row().predictor.name}`
    : `Review invalid readings: ${this.row().predictor.name}`);
  readonly description = computed(() => this.mode() === 'comparisons'
    ? 'Compare uploaded values with the readings currently saved for the same months.'
    : 'Invalid readings must be excluded before this upload can continue.');
  readonly ariaSort = computed<Record<ComparisonSortField, 'none' | 'ascending' | 'descending'>>(() => {
    const result: Record<ComparisonSortField, 'none' | 'ascending' | 'descending'> = {
      month: 'none', current: 'none', imported: 'none', difference: 'none', percentage: 'none'
    };
    result[this.sortField()] = this.sortDirection() === 'asc' ? 'ascending' : 'descending';
    return result;
  });
  readonly sortedComparisons = computed(() => {
    const field = this.sortField();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.row().comparisons].sort((left, right) =>
      compareValues(sortValue(left, field), sortValue(right, field)) * direction);
  });

  changeSort(field: ComparisonSortField): void {
    if (field === this.sortField()) {
      this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortField.set(field);
    this.sortDirection.set(field === 'month' ? 'desc' : 'asc');
  }
}

function sortValue(comparison: ImportPredictorReadingComparison, field: ComparisonSortField): number | undefined {
  if (field === 'month') return comparison.readMonth.getTime();
  if (field === 'current') return comparison.currentValue;
  if (field === 'imported') return comparison.importedValue;
  if (field === 'difference') return comparison.difference;
  return comparison.percentageDifference;
}

function compareValues(left: number | undefined, right: number | undefined): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}
