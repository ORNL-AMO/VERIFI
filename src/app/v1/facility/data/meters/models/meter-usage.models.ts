/** Calendarized usage aggregation and comparison facts for meter summary views. */
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { formatMeterNumber } from './meter-results.models';

type MeterUsageFactId = 'latest-month' | 'previous-year-month' | 'latest-twelve-month-average' | 'previous-twelve-month-average';
type MeterUsagePercentChangeTone = 'increase' | 'decrease' | 'neutral' | 'unavailable';

export interface MeterUsageRow {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly sortValue: number;
  readonly fiscalYear?: number;
  readonly energyUse: number;
  readonly energyConsumption: number;
  readonly energyCost: number;
}

interface MeterUsageFactView {
  readonly id: MeterUsageFactId;
  readonly label: string;
  readonly valueLabel: string;
  readonly periodLabel?: string;
  readonly unavailable: boolean;
  readonly changeLabel?: string;
  readonly changeTone?: MeterUsagePercentChangeTone;
}

export interface MeterUsageFactsView {
  readonly facts: readonly MeterUsageFactView[];
  readonly unitLabel?: string;
  readonly basisLabel?: 'Site' | 'Source';
}

export function buildMeterUsageFacts(
  rows: readonly MeterUsageRow[],
  options: { readonly useConsumption: boolean; readonly unit?: string }
): MeterUsageFactsView {
  const sortedRows = [...rows].sort((first, second) => first.sortValue - second.sortValue);
  const valuesByMonth = new Map<number, MeterUsageRow>();
  for (const row of sortedRows) {
    valuesByMonth.set(monthIndexFromRow(row), row);
  }
  const latestRow = sortedRows[sortedRows.length - 1];
  const latestMonthIndex = latestRow ? monthIndexFromRow(latestRow) : undefined;
  const previousYearRow = latestMonthIndex !== undefined ? valuesByMonth.get(latestMonthIndex - 12) : undefined;
  const latestAverage = latestMonthIndex !== undefined
    ? averageWindow(valuesByMonth, latestMonthIndex - 11, latestMonthIndex, options.useConsumption)
    : undefined;
  const previousAverage = latestMonthIndex !== undefined
    ? averageWindow(valuesByMonth, latestMonthIndex - 23, latestMonthIndex - 12, options.useConsumption)
    : undefined;
  const latestMonthPercentChange = latestRow && previousYearRow
    ? calculatePercentChange(usageRowUtilityValue(latestRow, options.useConsumption), usageRowUtilityValue(previousYearRow, options.useConsumption))
    : undefined;
  const averagePercentChange = previousAverage !== undefined && latestAverage !== undefined
    ? calculatePercentChange(latestAverage, previousAverage)
    : undefined;
  const latestAverageRangeLabel = latestMonthIndex !== undefined && latestAverage !== undefined
    ? formatMonthRange(latestMonthIndex - 11, latestMonthIndex)
    : undefined;
  const previousAverageRangeLabel = latestMonthIndex !== undefined && previousAverage !== undefined
    ? formatMonthRange(latestMonthIndex - 23, latestMonthIndex - 12)
    : undefined;
  const latestAverageChangeLabel = averagePercentChange === undefined
    ? 'Change not available'
    : formatPercentChange(averagePercentChange, 'vs previous 12 mo');
  const latestMonthChangeLabel = latestMonthPercentChange === undefined
    ? 'Change not available'
    : formatPercentChange(latestMonthPercentChange, 'vs same month last year');

  return {
    unitLabel: options.unit,
    facts: [
      usageFact(
        'latest-month',
        latestRow?.periodLabel ?? 'Latest month',
        latestRow,
        options,
        latestMonthChangeLabel,
        percentChangeTone(latestMonthPercentChange)
      ),
      usageFact('previous-year-month', previousYearRow?.periodLabel ?? 'Same month last year', previousYearRow, options),
      averageUsageFact(
        'latest-twelve-month-average',
        latestAverageRangeLabel ?? 'Latest 12-mo avg',
        latestAverage,
        latestAverageChangeLabel,
        percentChangeTone(averagePercentChange)
      ),
      averageUsageFact(
        'previous-twelve-month-average',
        previousAverageRangeLabel ?? 'Previous 12-mo avg',
        previousAverage
      )
    ]
  };
}

export function buildMeterUsageFactsFromCalendarizedMeters(
  calendarizedMeters: readonly CalanderizedMeter[],
  facility: IdbFacility | undefined
): MeterUsageFactsView {
  const rows = aggregateCalendarizedMeterRows(calendarizedMeters);
  const useConsumption = calendarizedMeters.some(calendarizedMeter => calendarizedMeter.showConsumption)
    && !calendarizedMeters.some(calendarizedMeter => calendarizedMeter.showEnergyUse);
  const unit = useConsumption
    ? firstDefined(calendarizedMeters.map(calendarizedMeter => calendarizedMeter.consumptionUnit))
    : firstDefined(calendarizedMeters.map(calendarizedMeter => calendarizedMeter.energyUnit)) ?? facility?.energyUnit;
  return {
    ...buildMeterUsageFacts(rows, { useConsumption, unit }),
    basisLabel: useConsumption || calendarizedMeters.length === 0
      ? undefined
      : calendarizedMeters.some(calendarizedMeter => calendarizedMeter.energyIsSource) ? 'Source' : 'Site'
  };
}

export function aggregateCalendarizedMeterRows(calendarizedMeters: readonly CalanderizedMeter[]): MeterUsageRow[] {
  const rowsByMonth = new Map<string, MeterUsageRow>();
  for (const monthlyData of calendarizedMeters.flatMap(calendarizedMeter => calendarizedMeter.monthlyData)) {
    const key = `${monthlyData.year}-${monthlyData.monthNumValue}`;
    const existing = rowsByMonth.get(key);
    rowsByMonth.set(key, existing
      ? addMonthlyDataToRow(existing, monthlyData)
      : monthlyDataToUsageRow(monthlyData));
  }
  return [...rowsByMonth.values()].sort((first, second) => first.sortValue - second.sortValue);
}

function calculatePercentChange(latestValue: number, previousValue: number): number | undefined {
  return previousValue !== 0
    ? ((latestValue - previousValue) / previousValue) * 100
    : undefined;
}

function monthlyDataToUsageRow(monthlyData: MonthlyData): MeterUsageRow {
  return {
    periodKey: `${monthlyData.year}-${monthlyData.monthNumValue}`,
    periodLabel: monthlyData.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    sortValue: monthlyData.date.getTime(),
    fiscalYear: monthlyData.fiscalYear,
    energyUse: monthlyData.energyUse,
    energyConsumption: monthlyData.energyConsumption,
    energyCost: monthlyData.energyCost
  };
}

function addMonthlyDataToRow(row: MeterUsageRow, monthlyData: MonthlyData): MeterUsageRow {
  return {
    ...row,
    energyUse: row.energyUse + monthlyData.energyUse,
    energyConsumption: row.energyConsumption + monthlyData.energyConsumption,
    energyCost: row.energyCost + monthlyData.energyCost
  };
}

function usageFact(
  id: MeterUsageFactId,
  label: string,
  row: MeterUsageRow | undefined,
  options: { readonly useConsumption: boolean },
  changeLabel?: string,
  changeTone?: MeterUsagePercentChangeTone
): MeterUsageFactView {
  if (!row) {
    return unavailableUsageFact(id, label, changeLabel, changeTone);
  }
  return {
    id,
    label,
    valueLabel: formatMeterNumber(usageRowUtilityValue(row, options.useConsumption)),
    unavailable: false,
    changeLabel,
    changeTone
  };
}

function averageUsageFact(
  id: MeterUsageFactId,
  label: string,
  value: number | undefined,
  changeLabel?: string,
  changeTone?: MeterUsagePercentChangeTone
): MeterUsageFactView {
  if (value === undefined) {
    return unavailableUsageFact(id, label, changeLabel, changeTone);
  }
  return {
    id,
    label,
    valueLabel: formatMeterNumber(value),
    unavailable: false,
    changeLabel,
    changeTone
  };
}

function unavailableUsageFact(
  id: MeterUsageFactId,
  label: string,
  changeLabel?: string,
  changeTone?: MeterUsagePercentChangeTone
): MeterUsageFactView {
  return {
    id,
    label,
    valueLabel: 'Not available',
    unavailable: true,
    changeLabel,
    changeTone
  };
}

function averageWindow(
  rowsByMonth: ReadonlyMap<number, MeterUsageRow>,
  startMonthIndex: number,
  endMonthIndex: number,
  useConsumption: boolean
): number | undefined {
  let total = 0;
  let count = 0;
  for (let monthIndex = startMonthIndex; monthIndex <= endMonthIndex; monthIndex++) {
    const row = rowsByMonth.get(monthIndex);
    if (!row) {
      return undefined;
    }
    total += usageRowUtilityValue(row, useConsumption);
    count++;
  }
  return count === 12 ? total / 12 : undefined;
}

function monthIndexFromRow(row: MeterUsageRow): number {
  const [year, month] = row.periodKey.split('-').map(value => Number(value));
  if (Number.isFinite(year) && Number.isFinite(month)) {
    return year * 12 + month + 1;
  }
  const date = new Date(row.sortValue);
  return date.getFullYear() * 12 + date.getMonth() + 1;
}

function usageRowUtilityValue(row: MeterUsageRow, useConsumption: boolean): number {
  return useConsumption ? row.energyConsumption : row.energyUse;
}

function formatPercentChange(value: number, suffix: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMeterNumber(value)}% ${suffix}`;
}

function percentChangeTone(value: number | undefined): MeterUsagePercentChangeTone {
  if (value === undefined) {
    return 'unavailable';
  }
  if (value > 0) {
    return 'increase';
  }
  if (value < 0) {
    return 'decrease';
  }
  return 'neutral';
}

function firstDefined(values: readonly (string | undefined)[]): string | undefined {
  return values.find(value => value !== undefined && value !== '');
}

function formatMonthRange(startMonthIndex: number, endMonthIndex: number): string {
  return `AVG. ${formatMonthIndex(startMonthIndex)} - ${formatMonthIndex(endMonthIndex)}`;
}

function formatMonthIndex(monthIndex: number): string {
  const year = Math.floor((monthIndex - 1) / 12);
  const month = ((monthIndex - 1) % 12);
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
