import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { ImportMeterReadingComparison } from '@data/import/meter-reading-import-review';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ImportMeterReadingRow } from '../../../import-meter-review-state.service';

export type ImportMeterReadingReviewMode = 'comparisons' | 'invalid';
type ComparisonSortField = 'date' | 'current' | 'imported' | 'difference' | 'percentage';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-import-meter-reading-review-slideout',
  standalone: true,
  imports: [CommonModule, WorkspaceSlideoutComponent],
  templateUrl: './import-meter-reading-review-slideout.component.html',
  styleUrls: ['./import-meter-reading-review-slideout.component.css']
})
export class ImportMeterReadingReviewSlideoutComponent {
  readonly row = input.required<ImportMeterReadingRow>();
  readonly mode = input.required<ImportMeterReadingReviewMode>();
  readonly closed = output<void>();
  readonly exclusionChanged = output<{ index: number; excluded: boolean }>();

  readonly sortField = signal<ComparisonSortField>('date');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly title = computed(() => this.mode() === 'comparisons'
    ? `Compare meter readings: ${this.row().meter.name}`
    : `Review invalid readings: ${this.row().meter.name}`);
  readonly description = computed(() => this.mode() === 'comparisons'
    ? 'Compare uploaded values with the readings currently saved for the same dates.'
    : 'Invalid readings must be excluded before this upload can continue.');
  readonly ariaSort = computed<Record<ComparisonSortField, 'none' | 'ascending' | 'descending'>>(() => {
    const result: Record<ComparisonSortField, 'none' | 'ascending' | 'descending'> = {
      date: 'none', current: 'none', imported: 'none', difference: 'none', percentage: 'none'
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
    this.sortDirection.set(field === 'date' ? 'desc' : 'asc');
  }
}

function sortValue(comparison: ImportMeterReadingComparison, field: ComparisonSortField): number | undefined {
  if (field === 'date') return comparison.readDate.getTime();
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
