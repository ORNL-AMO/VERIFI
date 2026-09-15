import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import {
  MeterDataColumn,
  MeterYearlyDataColumnId,
  MeterYearlyDataRow,
  buildMeterDataColumns,
  buildMeterYearlyDataRows,
  meterCalendarizationMethodLabel,
  meterDataChartMetrics,
  meterDataColumnValue,
  meterWorkbenchTab,
  meterYearlyChartRows,
  preferredMeterCostMetricId,
  preferredMeterUtilityMetricId
} from '../../facility-meters.models';

type YearlyDataSortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-meter-workbench-yearly-data',
  templateUrl: './meter-workbench-yearly-data.component.html',
  styleUrls: ['./meter-workbench-yearly-data.component.css'],
  standalone: false
})
export class MeterWorkbenchYearlyDataComponent {
  private readonly copyTableService = inject(CopyTableService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

  readonly tab = meterWorkbenchTab('yearly');
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly account = this.workspace.account;
  readonly meter = this.workspace.selectedMeter;
  readonly facility = this.workspace.facility;
  readonly copyingTable = signal(false);
  readonly sortColumn = signal<MeterYearlyDataColumnId>('year');
  readonly sortDirection = signal<YearlyDataSortDirection>('desc');
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
    'yearly'
  ) as Array<MeterDataColumn<MeterYearlyDataColumnId>>);
  readonly rows = computed(() => buildMeterYearlyDataRows(this.selectedCalendarizedMeter()?.monthlyData ?? []));
  readonly sortedRows = computed(() => [...this.rows()].sort((first, second) => {
    const result = compareRows(first, second, this.sortColumn());
    return this.sortDirection() === 'asc' ? result : -result;
  }));
  readonly chartRows = computed(() => meterYearlyChartRows(this.rows()));
  readonly metrics = computed(() => meterDataChartMetrics(this.columns()));
  readonly defaultLeftMetricId = computed(() => preferredMeterUtilityMetricId(this.columns()));
  readonly defaultRightMetricId = computed(() => preferredMeterCostMetricId(this.columns()));

  @ViewChild('yearlyDataTable', { static: false }) yearlyDataTable?: ElementRef<HTMLTableElement>;

  requestSort(column: MeterYearlyDataColumnId): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(direction => direction === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  openSettings(): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { fragment: 'meter-reading-settings' });
    }
  }

  copyTable(): void {
    if (!this.yearlyDataTable) {
      return;
    }
    this.copyingTable.set(true);
    setTimeout(() => {
      this.copyTableService.copyTable(this.yearlyDataTable);
      this.copyingTable.set(false);
    }, 200);
  }

  columnValue(row: MeterYearlyDataRow, column: MeterDataColumn<MeterYearlyDataColumnId>): string {
    return meterDataColumnValue(row, column);
  }
}

function compareRows(first: MeterYearlyDataRow, second: MeterYearlyDataRow, column: MeterYearlyDataColumnId): number {
  if (column === 'year') {
    return first.year - second.year;
  }
  return (Number(first[column]) || 0) - (Number(second[column]) || 0);
}
