import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ImportMeterReadingRow } from '../../../import-meter-review-state.service';
import {
  importComparisonAriaSort,
  ImportComparisonSortDirection,
  ImportComparisonValueField,
  sortImportReadingComparisons
} from '../../../import-reading-comparison-sort';

export type ImportMeterReadingReviewMode = 'comparisons' | 'invalid';
type ComparisonSortField = 'date' | ImportComparisonValueField;
const COMPARISON_SORT_FIELDS: readonly ComparisonSortField[] =
  ['date', 'current', 'imported', 'difference', 'percentage'];

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
  readonly sortDirection = signal<ImportComparisonSortDirection>('desc');
  readonly title = computed(() => this.mode() === 'comparisons'
    ? `Compare meter readings: ${this.row().meter.name}`
    : `Review invalid readings: ${this.row().meter.name}`);
  readonly description = computed(() => this.mode() === 'comparisons'
    ? 'Compare uploaded values with the readings currently saved for the same dates.'
    : 'Invalid readings must be excluded before this upload can continue.');
  readonly ariaSort = computed(() => importComparisonAriaSort(
    COMPARISON_SORT_FIELDS, this.sortField(), this.sortDirection()));
  readonly sortedComparisons = computed(() => sortImportReadingComparisons(
    this.row().comparisons,
    this.sortField(),
    'date',
    comparison => comparison.readDate.getTime(),
    this.sortDirection()
  ));

  changeSort(field: ComparisonSortField): void {
    if (field === this.sortField()) {
      this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortField.set(field);
    this.sortDirection.set(field === 'date' ? 'desc' : 'asc');
  }
}
