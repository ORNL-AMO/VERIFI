import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { WorkspaceNavigationService } from '../../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { meterCalendarizationMethodLabel, meterWorkbenchTab } from '../../facility-meters.models';

type MonthlyDataSortDirection = 'asc' | 'desc';
type MonthlyDataColumnId =
  | 'date'
  | 'energyConsumption'
  | 'energyUse'
  | 'totalWithMarketEmissions'
  | 'totalWithLocationEmissions'
  | 'RECs'
  | 'excessRECs'
  | 'excessRECsEmissions'
  | 'stationaryBiogenicEmmissions'
  | 'stationaryCarbonEmissions'
  | 'stationaryOtherEmissions'
  | 'stationaryEmissions'
  | 'otherScope2Emissions'
  | 'mobileBiogenicEmissions'
  | 'mobileCarbonEmissions'
  | 'mobileOtherEmissions'
  | 'mobileTotalEmissions'
  | 'fugitiveEmissions'
  | 'processEmissions'
  | 'energyCost';

interface MonthlyDataColumn {
  readonly id: MonthlyDataColumnId;
  readonly label: string;
  readonly unit?: string;
  readonly currency?: boolean;
}

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
  readonly sortColumn = signal<MonthlyDataColumnId>('date');
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
  readonly columns = computed(() => buildMonthlyDataColumns(
    this.selectedCalendarizedMeter(),
    this.account(),
    this.isRECs(),
    this.consumptionLabel()
  ));
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

  requestSort(column: MonthlyDataColumnId): void {
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

  columnValue(row: MonthlyData, column: MonthlyDataColumn): string {
    if (column.id === 'date') {
      return row.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return formatMonthlyNumber(Number(row[column.id]) || 0, column.currency);
  }
}

function buildMonthlyDataColumns(
  calendarizedMeter: CalanderizedMeter | undefined,
  account: IdbAccount | undefined,
  isRECs: boolean,
  consumptionLabel: 'Consumption' | 'Distance'
): MonthlyDataColumn[] {
  const columns: MonthlyDataColumn[] = [{ id: 'date', label: 'Month' }];
  if (!calendarizedMeter) {
    return columns;
  }
  if (calendarizedMeter.showConsumption && !isRECs) {
    columns.push({
      id: 'energyConsumption',
      label: `Total ${consumptionLabel}`,
      unit: calendarizedMeter.consumptionUnit
    });
  }
  if (calendarizedMeter.showEnergyUse && !isRECs) {
    columns.push({
      id: 'energyUse',
      label: 'Total Energy',
      unit: calendarizedMeter.energyUnit
    });
  }
  if (account?.displayEmissions) {
    if (calendarizedMeter.showElectricalEmissions && !isRECs) {
      columns.push(
        { id: 'totalWithMarketEmissions', label: 'Total Market-Based Emissions', unit: 'tonne CO2e' },
        { id: 'totalWithLocationEmissions', label: 'Total Location-Based Emissions', unit: 'tonne CO2e' }
      );
    }
    if (isRECs) {
      columns.push(
        { id: 'RECs', label: 'RECs', unit: 'MWh' },
        { id: 'excessRECs', label: 'Excess RECs', unit: 'MWh' },
        { id: 'excessRECsEmissions', label: 'Excess RECs Emissions', unit: 'tonne CO2e' }
      );
    }
    if (calendarizedMeter.showStationaryEmissions) {
      columns.push(
        { id: 'stationaryBiogenicEmmissions', label: 'Total Biogenic Emissions', unit: 'tonne CO2e' },
        { id: 'stationaryCarbonEmissions', label: 'Total Carbon Emissions', unit: 'tonne CO2e' },
        { id: 'stationaryOtherEmissions', label: 'Total Other Emissions', unit: 'tonne CO2e' },
        { id: 'stationaryEmissions', label: 'Total Emissions', unit: 'tonne CO2e' }
      );
    }
    if (calendarizedMeter.showOtherScope2Emissions) {
      columns.push({ id: 'otherScope2Emissions', label: 'Total Emissions', unit: 'tonne CO2e' });
    }
    if (calendarizedMeter.showMobileEmissions) {
      columns.push(
        { id: 'mobileBiogenicEmissions', label: 'Mobile Biogenic Emissions', unit: 'tonne CO2e' },
        { id: 'mobileCarbonEmissions', label: 'Mobile Carbon Emissions', unit: 'tonne CO2e' },
        { id: 'mobileOtherEmissions', label: 'Mobile Other Emissions', unit: 'tonne CO2e' },
        { id: 'mobileTotalEmissions', label: 'Mobile Total Emissions', unit: 'tonne CO2e' }
      );
    }
    if (calendarizedMeter.showFugitiveEmissions) {
      columns.push({ id: 'fugitiveEmissions', label: 'Fugitive Emissions', unit: 'tonne CO2e' });
    }
    if (calendarizedMeter.showProcessEmissions) {
      columns.push({ id: 'processEmissions', label: 'Process Emissions', unit: 'tonne CO2e' });
    }
  }
  columns.push({ id: 'energyCost', label: 'Total Cost', currency: true });
  return columns;
}

function compareRows(first: MonthlyData, second: MonthlyData, column: MonthlyDataColumnId): number {
  if (column === 'date') {
    return new Date(first.date).getTime() - new Date(second.date).getTime();
  }
  return (Number(first[column]) || 0) - (Number(second[column]) || 0);
}

function formatMonthlyNumber(value: number, currency = false): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: currency ? 2 : 1,
    minimumFractionDigits: currency ? 2 : 0,
    style: currency ? 'currency' : 'decimal',
    currency: currency ? 'USD' : undefined
  }).format(value || 0);
}
