import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbUtilityMeter, MeterReadingDataApplication } from 'src/app/models/idbModels/utilityMeter';

type P1MonthlyDataView = 'table' | 'graph';
type P1MonthlySortField = keyof MonthlyData | 'date';

interface P1CalendarizationMethodOption {
  value: MeterReadingDataApplication;
  label: string;
  summary: string;
}

@Component({
  selector: 'app-p1-facility-meter-monthly-data',
  templateUrl: './meter-monthly-data.component.html',
  styleUrls: ['./meter-monthly-data.component.css'],
  standalone: false
})
export class P1FacilityMeterMonthlyDataComponent {
  @Input() meter: IdbUtilityMeter | undefined;
  @Input() calanderizedMeter: CalanderizedMeter | undefined;
  @Input() readingCount = 0;
  @Input() displayEmissions = false;
  @Input() canWrite = false;
  @Output() saveMethod = new EventEmitter<MeterReadingDataApplication>();

  readonly view = signal<P1MonthlyDataView>('table');
  readonly methodOptions: P1CalendarizationMethodOption[] = [
    {
      value: 'backward',
      label: 'Calendarize Meter Data',
      summary: 'Allocate each bill across the read period using daily use and the days applied to each month.'
    },
    {
      value: 'fullMonth',
      label: 'Do Not Calendarize',
      summary: 'Apply each bill to its read month without distributing the usage across neighboring months.'
    },
    {
      value: 'fullYear',
      label: 'Annual Meter Data',
      summary: 'Sum annual readings and distribute the yearly total evenly across 12 months.'
    }
  ];

  orderDataField: P1MonthlySortField = 'date';
  orderByDirection: 'asc' | 'desc' = 'desc';
  currentPageNumber = 1;
  itemsPerPage = 12;

  monthlyData(): MonthlyData[] {
    return [...(this.calanderizedMeter?.monthlyData ?? [])].sort((first, second) => {
      const direction = this.orderByDirection === 'asc' ? 1 : -1;
      return this.compareRows(first, second, this.orderDataField) * direction;
    });
  }

  pagedMonthlyData(): MonthlyData[] {
    const start = (this.currentPageNumber - 1) * this.itemsPerPage;
    return this.monthlyData().slice(start, start + this.itemsPerPage);
  }

  trendMonthlyData(): MonthlyData[] {
    return [...(this.calanderizedMeter?.monthlyData ?? [])]
      .sort((first, second) => this.dateValue(first) - this.dateValue(second))
      .slice(-24);
  }

  totals(): {
    months: number;
    energyUse: number;
    energyConsumption: number;
    energyCost: number;
    marketEmissions: number;
    locationEmissions: number;
  } {
    const rows = this.monthlyData();
    return {
      months: rows.length,
      energyUse: this.sum(rows, 'energyUse'),
      energyConsumption: this.sum(rows, 'energyConsumption'),
      energyCost: this.sum(rows, 'energyCost'),
      marketEmissions: this.sum(rows, 'totalWithMarketEmissions'),
      locationEmissions: this.sum(rows, 'totalWithLocationEmissions')
    };
  }

  setOrderDataField(field: P1MonthlySortField): void {
    if (field === this.orderDataField) {
      this.orderByDirection = this.orderByDirection === 'desc' ? 'asc' : 'desc';
      return;
    }
    this.orderDataField = field;
    this.orderByDirection = 'desc';
  }

  selectMethod(method: MeterReadingDataApplication): void {
    if (!this.canWrite || !method || this.meter?.meterReadingDataApplication === method) {
      return;
    }
    this.saveMethod.emit(method);
    this.currentPageNumber = 1;
  }

  hasMethod(): boolean {
    return !!this.meter?.meterReadingDataApplication;
  }

  methodLabel(method: MeterReadingDataApplication | undefined = this.meter?.meterReadingDataApplication): string {
    return this.methodOptions.find(option => option.value === method)?.label ?? 'No method selected';
  }

  consumptionLabel(): 'Consumption' | 'Distance' {
    return this.meter?.scope === 2 ? 'Distance' : 'Consumption';
  }

  isRECs(): boolean {
    return this.meter?.source === 'Electricity' && (this.meter.agreementType === 4 || this.meter.agreementType === 6);
  }

  tableColumnCount(): number {
    let count = 2;
    if (this.calanderizedMeter?.showConsumption && !this.isRECs()) {
      count++;
    }
    if (this.calanderizedMeter?.showEnergyUse && !this.isRECs()) {
      count++;
    }
    if (this.displayEmissions) {
      if (this.calanderizedMeter?.showElectricalEmissions) {
        count += this.isRECs() ? 3 : 2;
      }
      if (this.calanderizedMeter?.showStationaryEmissions) {
        count += 4;
      }
      if (this.calanderizedMeter?.showOtherScope2Emissions) {
        count++;
      }
      if (this.calanderizedMeter?.showMobileEmissions) {
        count += 4;
      }
      if (this.calanderizedMeter?.showFugitiveEmissions) {
        count++;
      }
      if (this.calanderizedMeter?.showProcessEmissions) {
        count++;
      }
    }
    return count;
  }

  lastPage(): number {
    return Math.max(Math.ceil(this.monthlyData().length / this.itemsPerPage), 1);
  }

  nextPage(): void {
    this.currentPageNumber = Math.min(this.currentPageNumber + 1, this.lastPage());
  }

  previousPage(): void {
    this.currentPageNumber = Math.max(this.currentPageNumber - 1, 1);
  }

  maxEnergyUse(): number {
    return Math.max(...this.trendMonthlyData().map(data => this.safeNumber(data.energyUse)), 0);
  }

  energyWidth(data: MonthlyData): number {
    const max = this.maxEnergyUse();
    return max > 0 ? Math.max((this.safeNumber(data.energyUse) / max) * 100, 2) : 0;
  }

  costWidth(data: MonthlyData): number {
    const max = Math.max(...this.trendMonthlyData().map(row => this.safeNumber(row.energyCost)), 0);
    return max > 0 ? Math.max((this.safeNumber(data.energyCost) / max) * 100, 2) : 0;
  }

  private compareRows(first: MonthlyData, second: MonthlyData, field: P1MonthlySortField): number {
    if (field === 'date') {
      return this.dateValue(first) - this.dateValue(second);
    }
    const firstValue = first[field];
    const secondValue = second[field];
    if (typeof firstValue === 'number' && typeof secondValue === 'number') {
      return firstValue - secondValue;
    }
    return String(firstValue ?? '').localeCompare(String(secondValue ?? ''));
  }

  private sum(rows: MonthlyData[], key: keyof MonthlyData): number {
    return rows.reduce((sum, row) => sum + this.safeNumber(row[key]), 0);
  }

  private safeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private dateValue(data: MonthlyData): number {
    return new Date(data.date).getTime();
  }
}
