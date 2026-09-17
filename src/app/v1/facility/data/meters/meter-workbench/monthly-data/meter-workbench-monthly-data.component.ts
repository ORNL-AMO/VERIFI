import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MonthlyData } from '@data/models/calanderization';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import {
  MeterDataColumn,
  MeterDataColumnId,
  buildMeterDataColumns,
  meterCalendarizationMethodLabel,
  meterDataColumnValue,
  meterWorkbenchTab
} from '@app/v1/facility/data/meters/facility-meters.models';

type MonthlyDataSortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-meter-workbench-monthly-data',
  templateUrl: './meter-workbench-monthly-data.component.html',
  styleUrls: ['./meter-workbench-monthly-data.component.css'],
  standalone: false
})
export class MeterWorkbenchMonthlyDataComponent {
  private readonly copyTableService = inject(CopyTableService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

  readonly tab = meterWorkbenchTab('monthly');
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly account = this.workspace.account;
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly copyingTable = signal(false);
  readonly sortColumn = signal<MeterDataColumnId>('date');
  readonly sortDirection = signal<MonthlyDataSortDirection>('desc');
  readonly selectedCalendarizedMeter = computed(() => {
    const selectedMeter = this.meter();
    return selectedMeter
      ? this.workspace.calendarizedMeters().find(calendarizedMeter => calendarizedMeter.meter.guid === selectedMeter.guid)
      : undefined;
  });
  readonly isRECs = computed(() => {
    const selectedMeter = this.meter();
    return selectedMeter?.source === 'Electricity' && (selectedMeter.agreementType === 4 || selectedMeter.agreementType === 6);
  });
  readonly consumptionLabel = computed(() => this.meter()?.scope === 2 ? 'Distance' : 'Consumption');
  readonly calendarizationMethodLabel = computed(() => meterCalendarizationMethodLabel(this.meter()?.meterReadingDataApplication));
  readonly columns = computed(() => buildMeterDataColumns(
    this.selectedCalendarizedMeter(),
    this.account(),
    this.isRECs(),
    this.consumptionLabel(),
    'monthly'
  ) as Array<MeterDataColumn<MeterDataColumnId>>);
  readonly rows = computed(() => this.selectedCalendarizedMeter()?.monthlyData ?? []);
  readonly sortedRows = computed(() => [...this.rows()].sort((first, second) => {
    const result = compareRows(first, second, this.sortColumn());
    return this.sortDirection() === 'asc' ? result : -result;
  }));
  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.sortedRows().length / this.pageSize())));
  readonly displayedRows = computed(() => {
    const start = (Math.min(this.currentPage(), this.maxPage()) - 1) * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });
  private readonly clampCurrentPage = effect(() => {
    const maxPage = this.maxPage();
    if (this.currentPage() > maxPage) {
      this.currentPage.set(maxPage);
    }
  });

  @ViewChild('monthlyDataTable', { static: false }) monthlyDataTable?: ElementRef<HTMLTableElement>;

  requestSort(column: MeterDataColumnId): void {
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

  openSettings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { fragment: 'meter-reading-settings' });
    }
  }

  openReadings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'readings'));
    }
  }

  copyTable(): void {
    if (!this.monthlyDataTable) {
      return;
    }
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.monthlyDataTable);
      this.copyingTable.set(false);
    }, 200);
  }

  columnValue(row: MonthlyData, column: MeterDataColumn<MeterDataColumnId>): string {
    return meterDataColumnValue(row, column);
  }
}

function compareRows(first: MonthlyData, second: MonthlyData, column: MeterDataColumnId): number {
  if (column === 'date') {
    return new Date(first.date).getTime() - new Date(second.date).getTime();
  }
  return (Number(first[column]) || 0) - (Number(second[column]) || 0);
}
