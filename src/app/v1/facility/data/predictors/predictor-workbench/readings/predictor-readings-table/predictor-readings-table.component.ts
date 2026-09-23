import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  PredictorReadingFilter,
  PredictorReadingSortColumn,
  PredictorReadingSortDirection,
  PredictorReadingTableRow,
  PredictorReadingTableView
} from '../../../models';

@Component({
  selector: 'app-predictor-readings-table',
  templateUrl: './predictor-readings-table.component.html',
  styleUrls: ['./predictor-readings-table.component.css'],
  standalone: true,
  imports: [NgbPaginationModule, IconComponent]
})
export class PredictorReadingsTableComponent {
  private static readonly emptyView: PredictorReadingTableView = { rows: [], hasAttention: false };
  private readonly viewState = signal<PredictorReadingTableView>(PredictorReadingsTableComponent.emptyView);
  private readonly selectedGuidsState = signal<ReadonlySet<string>>(new Set<string>());

  @Input() set view(value: PredictorReadingTableView | undefined) {
    this.viewState.set(value ?? PredictorReadingsTableComponent.emptyView);
    this.currentPage.set(1);
    this.selectedGuidsState.set(new Set<string>());
    if (!value?.hasAttention) this.filter.set('all');
  }
  @Input() predictorName?: string;
  @Input() canAct = true;
  @Output() addRequested = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<IdbPredictorData>();
  @Output() deleteRequested = new EventEmitter<IdbPredictorData>();
  @Output() bulkDeleteRequested = new EventEmitter<readonly IdbPredictorData[]>();

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly filter = signal<PredictorReadingFilter>('all');
  readonly sortColumn = signal<PredictorReadingSortColumn>('month');
  readonly sortDirection = signal<PredictorReadingSortDirection>('desc');
  readonly viewModel = this.viewState.asReadonly();
  readonly filteredRows = computed(() => this.filter() === 'attention'
    ? this.viewModel().rows.filter(row => row.attention.hasAttention)
    : this.viewModel().rows);
  readonly sortedRows = computed(() => [...this.filteredRows()].sort((first, second) =>
    compareRows(first, second, this.sortColumn(), this.sortDirection())));
  readonly displayedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });
  readonly selectedReadings = computed(() => {
    const selected = this.selectedGuidsState();
    return this.sortedRows().filter(row => selected.has(row.reading.guid)).map(row => row.reading);
  });
  readonly selectedCount = computed(() => this.selectedReadings().length);
  readonly allVisibleSelected = computed(() => {
    const displayed = this.displayedRows();
    const selected = this.selectedGuidsState();
    return displayed.length > 0 && displayed.every(row => selected.has(row.reading.guid));
  });

  requestSort(column: PredictorReadingSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(direction => direction === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.currentPage.set(1);
  }

  setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
  }

  setFilter(event: Event): void {
    this.filter.set((event.target as HTMLSelectElement).value as PredictorReadingFilter);
    this.currentPage.set(1);
    this.selectedGuidsState.set(new Set<string>());
  }

  toggleVisible(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedGuidsState());
    this.displayedRows().forEach(row => checked ? next.add(row.reading.guid) : next.delete(row.reading.guid));
    this.selectedGuidsState.set(next);
  }

  toggleRow(guid: string): void {
    const next = new Set(this.selectedGuidsState());
    next.has(guid) ? next.delete(guid) : next.add(guid);
    this.selectedGuidsState.set(next);
  }

  isSelected(guid: string): boolean {
    return this.selectedGuidsState().has(guid);
  }

  requestBulkDelete(): void {
    const readings = this.selectedReadings();
    if (this.canAct && readings.length > 0) this.bulkDeleteRequested.emit(readings);
  }
}

function compareRows(
  first: PredictorReadingTableRow,
  second: PredictorReadingTableRow,
  column: PredictorReadingSortColumn,
  direction: PredictorReadingSortDirection
): number {
  const firstValue = column === 'month' ? first.monthSortValue : first.valueSortValue;
  const secondValue = column === 'month' ? second.monthSortValue : second.valueSortValue;
  const primary = (firstValue - secondValue) * (direction === 'asc' ? 1 : -1);
  return primary || first.reading.guid.localeCompare(second.reading.guid);
}
