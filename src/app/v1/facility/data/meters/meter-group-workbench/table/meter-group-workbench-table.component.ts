import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  MeterGroupResultRow,
  MeterGroupResultsView,
  MeterGroupResultsPeriod,
  formatMeterGroupNumber,
  formatMeterGroupPeriodLabel,
  meterGroupResultRowsForPeriod,
  meterGroupResultUtilityValue
} from '../../facility-meters.models';

type MeterGroupResultsSortColumn = 'period' | 'utility' | 'cost';
type MeterGroupResultsSortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-meter-group-workbench-table',
  templateUrl: './meter-group-workbench-table.component.html',
  styleUrls: ['./meter-group-workbench-table.component.css'],
  standalone: false
})
export class MeterGroupWorkbenchTableComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly copyTableService = inject(CopyTableService);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly period = signal<MeterGroupResultsPeriod>(this.route.snapshot.data['meterGroupPeriod'] ?? 'monthly');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly copyingTable = signal(false);
  readonly sortColumn = signal<MeterGroupResultsSortColumn>('period');
  readonly sortDirection = signal<MeterGroupResultsSortDirection>('desc');
  readonly results = this.workspace.selectedMeterGroupResults;
  readonly rows = computed(() => meterGroupResultRowsForPeriod(this.results(), this.period()));
  readonly sortedRows = computed(() => [...this.rows()].sort((first, second) => {
    const result = compareRows(first, second, this.sortColumn(), this.results());
    return this.sortDirection() === 'asc' ? result : -result;
  }));
  readonly displayedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });

  @ViewChild('groupResultsTable', { static: false }) groupResultsTable?: ElementRef<HTMLTableElement>;

  requestSort(column: MeterGroupResultsSortColumn): void {
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

  copyTable(): void {
    if (!this.groupResultsTable) {
      return;
    }
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.groupResultsTable);
      this.copyingTable.set(false);
    }, 200);
  }

  periodLabel(row: MeterGroupResultRow): string {
    return formatMeterGroupPeriodLabel(row, this.period());
  }

  utilityValue(row: MeterGroupResultRow): string {
    return formatMeterGroupNumber(meterGroupResultUtilityValue(this.results(), row));
  }

  costValue(row: MeterGroupResultRow): string {
    return formatMeterGroupNumber(row.energyCost, true);
  }
}

function compareRows(
  first: MeterGroupResultRow,
  second: MeterGroupResultRow,
  column: MeterGroupResultsSortColumn,
  results: MeterGroupResultsView
): number {
  if (column === 'utility') {
    return meterGroupResultUtilityValue(results, first) - meterGroupResultUtilityValue(results, second);
  }
  if (column === 'cost') {
    return first.energyCost - second.energyCost;
  }
  return first.sortValue - second.sortValue;
}
