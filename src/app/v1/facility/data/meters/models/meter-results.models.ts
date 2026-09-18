/** Selected-meter table and chart contracts plus deterministic result transformations. */
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';

export type MeterResultsPeriod = 'monthly' | 'yearly';
export type MeterResultMetricId =
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
export type MeterDataColumnId = 'date' | MeterResultMetricId;
export type MeterYearlyDataColumnId = 'year' | MeterResultMetricId;

export interface MeterDataColumn<ColumnId extends string = string> {
  readonly id: ColumnId;
  readonly label: string;
  readonly unit?: string;
  readonly currency?: boolean;
}

export interface MeterYearlyDataRow {
  readonly year: number;
  readonly energyConsumption: number;
  readonly energyUse: number;
  readonly energyCost: number;
  readonly totalWithMarketEmissions: number;
  readonly totalWithLocationEmissions: number;
  readonly RECs: number;
  readonly excessRECs: number;
  readonly excessRECsEmissions: number;
  readonly stationaryBiogenicEmmissions: number;
  readonly stationaryCarbonEmissions: number;
  readonly stationaryOtherEmissions: number;
  readonly stationaryEmissions: number;
  readonly otherScope2Emissions: number;
  readonly mobileBiogenicEmissions: number;
  readonly mobileCarbonEmissions: number;
  readonly mobileOtherEmissions: number;
  readonly mobileTotalEmissions: number;
  readonly fugitiveEmissions: number;
  readonly processEmissions: number;
}

export interface MeterResultsChartMetric {
  readonly id: string;
  readonly label: string;
  readonly unit?: string;
  readonly currency?: boolean;
}

export interface MeterResultsChartRow {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly sortValue: number;
  readonly values: Readonly<Record<string, number>>;
}

export function buildMeterDataColumns(
  calendarizedMeter: CalanderizedMeter | undefined,
  account: { readonly displayEmissions?: boolean } | undefined,
  isRECs: boolean,
  consumptionLabel: 'Consumption' | 'Distance',
  period: MeterResultsPeriod = 'monthly'
): Array<MeterDataColumn<MeterDataColumnId | MeterYearlyDataColumnId>> {
  const columns: Array<MeterDataColumn<MeterDataColumnId | MeterYearlyDataColumnId>> = [
    period === 'yearly' ? { id: 'year', label: 'Fiscal Year' } : { id: 'date', label: 'Month' }
  ];
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
      label: `Total ${calendarizedMeter.energyIsSource ? 'Source' : 'Site'} Energy`,
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

export function buildMeterYearlyDataRows(monthlyRows: readonly MonthlyData[]): MeterYearlyDataRow[] {
  const rowsByYear = new Map<number, MeterYearlyDataRow>();
  for (const monthlyRow of monthlyRows) {
    const year = monthlyRow.fiscalYear ?? monthlyRow.year;
    const existing = rowsByYear.get(year);
    rowsByYear.set(year, existing
      ? addMonthlyDataToYearlyRow(existing, monthlyRow)
      : monthlyDataToYearlyRow(year, monthlyRow));
  }
  return [...rowsByYear.values()].sort((first, second) => first.year - second.year);
}

export function meterDataColumnValue(
  row: MonthlyData | MeterYearlyDataRow,
  column: MeterDataColumn<MeterDataColumnId | MeterYearlyDataColumnId>
): string {
  if (column.id === 'date') {
    return 'date' in row
      ? row.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '';
  }
  if (column.id === 'year') {
    return 'year' in row ? `FY ${row.year}` : '';
  }
  return formatMeterNumber(Number(row[column.id]) || 0, column.currency);
}

export function formatMeterNumber(value: number, currency = false): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: currency ? 2 : 1,
    minimumFractionDigits: currency ? 2 : 0,
    style: currency ? 'currency' : 'decimal',
    currency: currency ? 'USD' : undefined
  }).format(value || 0);
}

export function meterDataChartMetrics(
  columns: ReadonlyArray<MeterDataColumn<MeterDataColumnId | MeterYearlyDataColumnId>>
): MeterResultsChartMetric[] {
  return columns
    .filter((column): column is MeterDataColumn<MeterResultMetricId> => column.id !== 'date' && column.id !== 'year')
    .map(column => ({
      id: column.id,
      label: column.label,
      unit: column.unit,
      currency: column.currency
    }));
}

export function meterHasLifetimeCost(rows: readonly { readonly energyCost: number }[]): boolean {
  return rows.reduce((total, row) => total + row.energyCost, 0) !== 0;
}

export function meterMonthlyChartRows(monthlyRows: readonly MonthlyData[]): MeterResultsChartRow[] {
  return monthlyRows
    .map(row => ({
      periodKey: `${row.year}-${row.monthNumValue}`,
      periodLabel: row.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      sortValue: row.date.getTime(),
      values: meterResultMetricValues(row)
    }))
    .sort((first, second) => first.sortValue - second.sortValue);
}

export function meterYearlyChartRows(yearlyRows: readonly MeterYearlyDataRow[]): MeterResultsChartRow[] {
  return yearlyRows.map(row => ({
    periodKey: String(row.year),
    periodLabel: `FY ${row.year}`,
    sortValue: row.year,
    values: meterResultMetricValues(row)
  }));
}

export function preferredMeterUtilityMetricId(
  columns: ReadonlyArray<MeterDataColumn<MeterDataColumnId | MeterYearlyDataColumnId>>
): string | undefined {
  const ids = new Set(columns.map(column => column.id));
  if (ids.has('energyConsumption')) {
    return 'energyConsumption';
  }
  if (ids.has('energyUse')) {
    return 'energyUse';
  }
  return columns.find(column => column.id !== 'date' && column.id !== 'year' && column.id !== 'energyCost')?.id;
}

export function preferredMeterCostMetricId(
  columns: ReadonlyArray<MeterDataColumn<MeterDataColumnId | MeterYearlyDataColumnId>>
): string | undefined {
  return columns.some(column => column.id === 'energyCost') ? 'energyCost' : undefined;
}

function monthlyDataToYearlyRow(year: number, monthlyRow: MonthlyData): MeterYearlyDataRow {
  return addMonthlyDataToYearlyRow(emptyYearlyRow(year), monthlyRow);
}

function emptyYearlyRow(year: number): MeterYearlyDataRow {
  return {
    year,
    energyConsumption: 0,
    energyUse: 0,
    energyCost: 0,
    totalWithMarketEmissions: 0,
    totalWithLocationEmissions: 0,
    RECs: 0,
    excessRECs: 0,
    excessRECsEmissions: 0,
    stationaryBiogenicEmmissions: 0,
    stationaryCarbonEmissions: 0,
    stationaryOtherEmissions: 0,
    stationaryEmissions: 0,
    otherScope2Emissions: 0,
    mobileBiogenicEmissions: 0,
    mobileCarbonEmissions: 0,
    mobileOtherEmissions: 0,
    mobileTotalEmissions: 0,
    fugitiveEmissions: 0,
    processEmissions: 0
  };
}

function addMonthlyDataToYearlyRow(row: MeterYearlyDataRow, monthlyRow: MonthlyData): MeterYearlyDataRow {
  return {
    year: row.year,
    energyConsumption: row.energyConsumption + monthlyRow.energyConsumption,
    energyUse: row.energyUse + monthlyRow.energyUse,
    energyCost: row.energyCost + monthlyRow.energyCost,
    totalWithMarketEmissions: row.totalWithMarketEmissions + monthlyRow.totalWithMarketEmissions,
    totalWithLocationEmissions: row.totalWithLocationEmissions + monthlyRow.totalWithLocationEmissions,
    RECs: row.RECs + monthlyRow.RECs,
    excessRECs: row.excessRECs + monthlyRow.excessRECs,
    excessRECsEmissions: row.excessRECsEmissions + monthlyRow.excessRECsEmissions,
    stationaryBiogenicEmmissions: row.stationaryBiogenicEmmissions + monthlyRow.stationaryBiogenicEmmissions,
    stationaryCarbonEmissions: row.stationaryCarbonEmissions + monthlyRow.stationaryCarbonEmissions,
    stationaryOtherEmissions: row.stationaryOtherEmissions + monthlyRow.stationaryOtherEmissions,
    stationaryEmissions: row.stationaryEmissions + monthlyRow.stationaryEmissions,
    otherScope2Emissions: row.otherScope2Emissions + monthlyRow.otherScope2Emissions,
    mobileBiogenicEmissions: row.mobileBiogenicEmissions + monthlyRow.mobileBiogenicEmissions,
    mobileCarbonEmissions: row.mobileCarbonEmissions + monthlyRow.mobileCarbonEmissions,
    mobileOtherEmissions: row.mobileOtherEmissions + monthlyRow.mobileOtherEmissions,
    mobileTotalEmissions: row.mobileTotalEmissions + monthlyRow.mobileTotalEmissions,
    fugitiveEmissions: row.fugitiveEmissions + monthlyRow.fugitiveEmissions,
    processEmissions: row.processEmissions + monthlyRow.processEmissions
  };
}

function meterResultMetricValues(row: MonthlyData | MeterYearlyDataRow): Readonly<Record<string, number>> {
  return {
    energyConsumption: row.energyConsumption,
    energyUse: row.energyUse,
    totalWithMarketEmissions: row.totalWithMarketEmissions,
    totalWithLocationEmissions: row.totalWithLocationEmissions,
    RECs: row.RECs,
    excessRECs: row.excessRECs,
    excessRECsEmissions: row.excessRECsEmissions,
    stationaryBiogenicEmmissions: row.stationaryBiogenicEmmissions,
    stationaryCarbonEmissions: row.stationaryCarbonEmissions,
    stationaryOtherEmissions: row.stationaryOtherEmissions,
    stationaryEmissions: row.stationaryEmissions,
    otherScope2Emissions: row.otherScope2Emissions,
    mobileBiogenicEmissions: row.mobileBiogenicEmissions,
    mobileCarbonEmissions: row.mobileCarbonEmissions,
    mobileOtherEmissions: row.mobileOtherEmissions,
    mobileTotalEmissions: row.mobileTotalEmissions,
    fugitiveEmissions: row.fugitiveEmissions,
    processEmissions: row.processEmissions,
    energyCost: row.energyCost
  };
}
