/** Aggregated meter-group result views, summaries, periods, and display helpers. */
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { MeterCardView } from './meter-card.models';
import { MeterGroupSectionView } from './meter-grouping.models';
import { formatMeterNumber, MeterResultsPeriod } from './meter-results.models';
import {
  aggregateCalendarizedMeterRows,
  buildMeterUsageFacts,
  MeterUsageFactsView,
  MeterUsageRow
} from './meter-usage.models';

export type MeterGroupResultsPeriod = MeterResultsPeriod;
export type MeterGroupResultRow = MeterUsageRow;

interface MeterGroupResultSummary {
  readonly assignedMeterCount: number;
  readonly firstDataLabel: string;
  readonly latestDataLabel: string;
  readonly utilityTotalLabel: string;
  readonly utilityTotalValue: number;
  readonly costTotalLabel: string;
  readonly costTotalValue: number;
}

export interface MeterGroupResultsView {
  readonly group?: IdbUtilityMeterGroup;
  readonly assignedMeters: readonly MeterCardView[];
  readonly calendarizedMeters: readonly CalanderizedMeter[];
  readonly monthlyRows: readonly MeterGroupResultRow[];
  readonly yearlyRows: readonly MeterGroupResultRow[];
  readonly showEnergyUse: boolean;
  readonly showConsumption: boolean;
  readonly showCost: boolean;
  readonly utilityLabel: string;
  readonly utilityUnit: string;
  readonly summary: MeterGroupResultSummary;
  readonly usageFacts: MeterUsageFactsView;
}

export function buildMeterGroupResultsView(
  group: IdbUtilityMeterGroup | undefined,
  facility: IdbFacility | undefined,
  groupSections: readonly MeterGroupSectionView[],
  calendarizedMeters: readonly CalanderizedMeter[]
): MeterGroupResultsView {
  const assignedMeters = group
    ? groupSections.find(section => section.group?.guid === group.guid)?.meters ?? []
    : [];
  const groupCalendarizedMeters = group
    ? calendarizedMeters.filter(calendarizedMeter => calendarizedMeter.meter.groupId === group.guid)
    : [];
  const monthlyRows = aggregateCalendarizedMeterRows(groupCalendarizedMeters);
  const yearlyRows = aggregateMeterGroupYearlyRows(monthlyRows);
  const showEnergyUse = group?.groupType === 'Energy' && monthlyRows.some(row => row.energyUse > 0);
  const showConsumption = group?.groupType === 'Water' && monthlyRows.some(row => row.energyConsumption > 0);
  const showCost = monthlyRows.some(row => row.energyCost > 0);
  const utilityLabel = showConsumption ? 'Total Consumption' : 'Total Energy';
  const utilityUnit = showConsumption
    ? facility?.volumeLiquidUnit ?? ''
    : facility?.energyUnit ?? '';
  const utilityTotalValue = sumRows(monthlyRows, showConsumption ? 'energyConsumption' : 'energyUse');
  const costTotalValue = sumRows(monthlyRows, 'energyCost');
  const usageFacts = buildMeterUsageFacts(monthlyRows, {
    useConsumption: showConsumption,
    unit: utilityUnit
  });

  return {
    group,
    assignedMeters,
    calendarizedMeters: groupCalendarizedMeters,
    monthlyRows,
    yearlyRows,
    showEnergyUse,
    showConsumption,
    showCost,
    utilityLabel,
    utilityUnit,
    usageFacts,
    summary: {
      assignedMeterCount: assignedMeters.length,
      firstDataLabel: firstResultPeriodLabel(monthlyRows),
      latestDataLabel: latestResultPeriodLabel(monthlyRows),
      utilityTotalLabel: formatMeterGroupNumber(utilityTotalValue),
      utilityTotalValue,
      costTotalLabel: formatMeterGroupNumber(costTotalValue, true),
      costTotalValue
    }
  };
}

export function meterGroupResultRowsForPeriod(
  results: MeterGroupResultsView,
  period: MeterGroupResultsPeriod
): readonly MeterGroupResultRow[] {
  return period === 'yearly' ? results.yearlyRows : results.monthlyRows;
}

export function meterGroupResultUtilityValue(results: MeterGroupResultsView, row: MeterGroupResultRow): number {
  return results.showConsumption ? row.energyConsumption : row.energyUse;
}

export function formatMeterGroupNumber(value: number, currency = false): string {
  return formatMeterNumber(value, currency);
}

export function formatMeterGroupPeriodLabel(row: MeterGroupResultRow, period: MeterGroupResultsPeriod): string {
  return period === 'yearly' ? `FY ${row.periodLabel}` : row.periodLabel;
}

function aggregateMeterGroupYearlyRows(monthlyRows: readonly MeterGroupResultRow[]): MeterGroupResultRow[] {
  const rowsByYear = new Map<number, MeterGroupResultRow>();
  for (const monthlyRow of monthlyRows) {
    const fiscalYear = monthlyRow.fiscalYear ?? new Date(monthlyRow.sortValue).getFullYear();
    const existing = rowsByYear.get(fiscalYear);
    if (existing) {
      rowsByYear.set(fiscalYear, {
        ...existing,
        energyUse: existing.energyUse + monthlyRow.energyUse,
        energyConsumption: existing.energyConsumption + monthlyRow.energyConsumption,
        energyCost: existing.energyCost + monthlyRow.energyCost
      });
    } else {
      rowsByYear.set(fiscalYear, {
        periodKey: String(fiscalYear),
        periodLabel: String(fiscalYear),
        sortValue: fiscalYear,
        fiscalYear,
        energyUse: monthlyRow.energyUse,
        energyConsumption: monthlyRow.energyConsumption,
        energyCost: monthlyRow.energyCost
      });
    }
  }
  return [...rowsByYear.values()].sort((first, second) => first.sortValue - second.sortValue);
}

function firstResultPeriodLabel(rows: readonly MeterGroupResultRow[]): string {
  return rows[0]?.periodLabel ?? 'No data';
}

function latestResultPeriodLabel(rows: readonly MeterGroupResultRow[]): string {
  return rows[rows.length - 1]?.periodLabel ?? 'No data';
}

function sumRows(rows: readonly MeterGroupResultRow[], field: 'energyUse' | 'energyConsumption' | 'energyCost'): number {
  return rows.reduce((total, row) => total + row[field], 0);
}
