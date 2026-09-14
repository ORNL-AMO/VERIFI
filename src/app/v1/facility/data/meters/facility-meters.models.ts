import { AllSources, EnergySources, MeterSource, WaterSources } from '@data/models/constantsAndTypes';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ScopeOptions } from '@data/models/scopeOption';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { StatusCheckAction } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { UtilityColors } from '@shared/utilityColors';

export type MeterWorkbenchTabId = 'settings' | 'readings' | 'monthly' | 'yearly' | 'quality';
export type MeterGroupWorkbenchTabId = 'monthly-table' | 'monthly-graph' | 'yearly-table' | 'yearly-graph';
export type MeterGroupSectionTone = 'energy' | 'water' | 'other' | 'ungrouped';
export type MeterGroupDropTargetId = string | 'ungrouped';
export type MeterGroupType = IdbUtilityMeterGroup['groupType'];
export type MeterCardStatusTone = 'success' | 'warning' | 'danger' | 'info';
export type MeterGroupResultsState = 'idle' | 'loading' | 'ready' | 'error';
export type MeterGroupResultsPeriod = 'monthly' | 'yearly';
export type MeterGroupChartSeriesDisplay = 'off' | 'bar' | 'line';
export type MeterUsageFactId = 'latest-month' | 'previous-year-month' | 'latest-twelve-month-average' | 'previous-twelve-month-average';
export type MeterUsagePercentChangeTone = 'increase' | 'decrease' | 'neutral' | 'unavailable';
export type MetersGroupingSlideout =
  | { readonly kind: 'add-group' }
  | { readonly kind: 'edit-group'; readonly group: IdbUtilityMeterGroup; readonly assignedMeterCount: number }
  | { readonly kind: 'move-meter'; readonly card: MeterCardView };

export const UNGROUPED_DROP_TARGET_ID = 'ungrouped';
export const METER_SOURCES: ReadonlyArray<MeterSource> = AllSources;
export const METER_GROUP_TYPES: ReadonlyArray<MeterGroupType> = ['Energy', 'Water', 'Other'];

export interface MeterWorkbenchTab {
  readonly id: MeterWorkbenchTabId;
  readonly label: string;
  readonly icon: string;
  readonly summary: string;
}

export interface MeterGroupWorkbenchTab {
  readonly id: MeterGroupWorkbenchTabId;
  readonly label: string;
  readonly icon: string;
}

export interface MeterCardView {
  readonly meter: IdbUtilityMeter;
  readonly group?: IdbUtilityMeterGroup;
  readonly readingCount: number;
  readonly meterStatusCheck?: MeterStatusCheck;
  readonly sourceColor?: string;
  readonly statusLabel?: string;
  readonly statusTone?: MeterCardStatusTone;
  readonly statusIcon?: string;
  readonly firstReadingLabel?: string;
  readonly latestReadingLabel?: string;
  readonly scopeLabel?: string;
  readonly fuelLabel?: string;
  readonly statusIssueLabels?: readonly string[];
  readonly statusActionSummaries?: readonly string[];
  readonly usageFacts?: MeterUsageFactsView;
}

export interface MeterGroupSectionView {
  readonly id: string;
  readonly label: string;
  readonly tone: MeterGroupSectionTone;
  readonly group?: IdbUtilityMeterGroup;
  readonly meters: readonly MeterCardView[];
}

export interface MeterDraft {
  readonly name: string;
  readonly source: MeterSource;
  readonly groupId?: string;
}

export interface MeterGroupDraft {
  readonly name: string;
  readonly groupType: MeterGroupType;
  readonly description?: string;
}

export interface MeterGroupDropTarget {
  readonly id: MeterGroupDropTargetId;
  readonly label: string;
  readonly group?: IdbUtilityMeterGroup;
}

export interface MeterDropEvent {
  readonly card: MeterCardView;
  readonly target: MeterGroupDropTarget;
}

export interface MeterGroupResultRow {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly sortValue: number;
  readonly fiscalYear?: number;
  readonly energyUse: number;
  readonly energyConsumption: number;
  readonly energyCost: number;
}

export interface MeterGroupResultSummary {
  readonly assignedMeterCount: number;
  readonly firstDataLabel: string;
  readonly latestDataLabel: string;
  readonly utilityTotalLabel: string;
  readonly utilityTotalValue: number;
  readonly costTotalLabel: string;
  readonly costTotalValue: number;
}

export interface MeterUsageFactView {
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

export const METER_WORKBENCH_TABS: ReadonlyArray<MeterWorkbenchTab> = [
  { id: 'settings', label: 'Settings', icon: 'fa-sliders', summary: 'Meter settings and assignment content is WIP.' },
  { id: 'readings', label: 'Readings', icon: 'fa-table-list', summary: 'Meter reading and utility bill tables are WIP.' },
  { id: 'monthly', label: 'Monthly Data', icon: 'fa-calendar-days', summary: 'Monthly calendarized data review is WIP.' },
  { id: 'yearly', label: 'Yearly Data', icon: 'fa-chart-column', summary: 'Yearly meter rollups are WIP.' },
  { id: 'quality', label: 'Quality Report', icon: 'fa-triangle-exclamation', summary: 'Meter data quality report content is WIP.' }
];

export const METER_GROUP_WORKBENCH_TABS: ReadonlyArray<MeterGroupWorkbenchTab> = [
  { id: 'monthly-table', label: 'Monthly Table', icon: 'fa-table-list' },
  { id: 'monthly-graph', label: 'Monthly Graph', icon: 'fa-chart-line' },
  { id: 'yearly-table', label: 'Yearly Table', icon: 'fa-calendar-days' },
  { id: 'yearly-graph', label: 'Yearly Graph', icon: 'fa-chart-column' }
];

export function buildMeterCards(
  meters: readonly IdbUtilityMeter[],
  meterData: readonly IdbUtilityMeterData[],
  groups: readonly IdbUtilityMeterGroup[],
  meterStatusChecks: readonly MeterStatusCheck[] = [],
  facility?: IdbFacility,
  calendarizedMeters: readonly CalanderizedMeter[] = []
): MeterCardView[] {
  return [...meters]
    .sort(sortMetersByName)
    .map(meter => {
      const readings = meterData.filter(reading => reading.meterId === meter.guid);
      const meterStatusCheck = meterStatusChecks.find(statusCheck => statusCheck.meterId === meter.guid);
      const meterCalendarizedMeters = calendarizedMeters.filter(calendarizedMeter => calendarizedMeter.meter.guid === meter.guid);
      return {
        meter,
        group: groups.find(group => group.guid === meter.groupId),
        readingCount: readings.length,
        meterStatusCheck,
        sourceColor: meterSourceColor(meter.source),
        statusLabel: meterStatusLabel(meterStatusCheck),
        statusTone: meterStatusTone(meterStatusCheck),
        statusIcon: meterStatusIcon(meterStatusCheck),
        firstReadingLabel: firstReadingLabel(readings),
        latestReadingLabel: latestReadingLabel(meterStatusCheck, readings),
        scopeLabel: scopeLabel(meter.scope),
        fuelLabel: fuelLabel(meter),
        statusIssueLabels: meterStatusIssueLabels(meterStatusCheck),
        statusActionSummaries: meterStatusActionSummaries(meterStatusCheck),
        usageFacts: meterCalendarizedMeters.length > 0
          ? buildMeterUsageFactsFromCalendarizedMeters(meterCalendarizedMeters, facility)
          : undefined
      };
    });
}

export function buildMeterGroupSections(
  meters: readonly IdbUtilityMeter[],
  meterData: readonly IdbUtilityMeterData[],
  groups: readonly IdbUtilityMeterGroup[],
  meterStatusChecks: readonly MeterStatusCheck[] = []
): MeterGroupSectionView[] {
  const cards = buildMeterCards(meters, meterData, groups, meterStatusChecks);
  const groupedSections = [...groups]
    .sort(sortGroupsForDisplay)
    .map(group => ({
      id: group.guid,
      label: group.name,
      tone: groupTone(group),
      group,
      meters: cards.filter(card => card.meter.groupId === group.guid)
    }));
  const ungroupedMeters = cards.filter(card => !card.meter.groupId);
  if (meters.length === 0 && groups.length === 0) {
    return [];
  }
  return [
    ...groupedSections,
    {
      id: UNGROUPED_DROP_TARGET_ID,
      label: 'Ungrouped',
      tone: 'ungrouped',
      meters: ungroupedMeters
    }
  ];
}

export function meterTabLabel(tabId: MeterWorkbenchTabId): string {
  return meterWorkbenchTab(tabId).label;
}

export function meterTabSummary(tabId: MeterWorkbenchTabId): string {
  return meterWorkbenchTab(tabId).summary;
}

export function meterWorkbenchTab(tabId: MeterWorkbenchTabId): MeterWorkbenchTab {
  return METER_WORKBENCH_TABS.find(tab => tab.id === tabId) ?? METER_WORKBENCH_TABS[0];
}

export function meterGroupWorkbenchTab(tabId: MeterGroupWorkbenchTabId): MeterGroupWorkbenchTab {
  return METER_GROUP_WORKBENCH_TABS.find(tab => tab.id === tabId) ?? METER_GROUP_WORKBENCH_TABS[0];
}

export function meterGroupWorkbenchTabPeriod(tabId: MeterGroupWorkbenchTabId): MeterGroupResultsPeriod {
  return tabId === 'yearly-table' || tabId === 'yearly-graph' ? 'yearly' : 'monthly';
}

export function meterGroupDropListId(sectionId: string): string {
  return `v1-meter-group-drop-${sectionId}`;
}

export function meterGroupTargetFromSection(section: MeterGroupSectionView): MeterGroupDropTarget {
  return {
    id: section.group?.guid ?? UNGROUPED_DROP_TARGET_ID,
    label: section.label,
    group: section.group
  };
}

export function canAssignMeterToGroup(meter: IdbUtilityMeter, group?: IdbUtilityMeterGroup): boolean {
  return canAssignSourceToGroup(meter.source, group);
}

export function canAssignSourceToGroup(source: MeterSource, group?: IdbUtilityMeterGroup): boolean {
  if (!group) {
    return true;
  }
  switch (group.groupType) {
    case 'Energy':
      return EnergySources.includes(source);
    case 'Water':
      return WaterSources.includes(source);
    case 'Other':
    default:
      return true;
  }
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
  const monthlyRows = aggregateMeterGroupMonthlyRows(groupCalendarizedMeters);
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

export function buildMeterUsageFacts(
  rows: readonly MeterGroupResultRow[],
  options: { readonly useConsumption: boolean; readonly unit?: string }
): MeterUsageFactsView {
  const sortedRows = [...rows].sort((first, second) => first.sortValue - second.sortValue);
  const valuesByMonth = new Map<number, MeterGroupResultRow>();
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
    ? calculatePercentChange(meterGroupResultRowUtilityValue(latestRow, options.useConsumption), meterGroupResultRowUtilityValue(previousYearRow, options.useConsumption))
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

function calculatePercentChange(latestValue: number, previousValue: number): number | undefined {
  return previousValue !== 0
    ? ((latestValue - previousValue) / previousValue) * 100
    : undefined;
}

export function buildMeterUsageFactsFromCalendarizedMeters(
  calendarizedMeters: readonly CalanderizedMeter[],
  facility: IdbFacility | undefined
): MeterUsageFactsView {
  const rows = aggregateMeterGroupMonthlyRows(calendarizedMeters);
  const useConsumption = calendarizedMeters.some(calendarizedMeter => calendarizedMeter.showConsumption)
    && !calendarizedMeters.some(calendarizedMeter => calendarizedMeter.showEnergyUse);
  const unit = useConsumption
    ? firstDefined(calendarizedMeters.map(calendarizedMeter => calendarizedMeter.consumptionUnit))
    : firstDefined(calendarizedMeters.map(calendarizedMeter => calendarizedMeter.energyUnit)) ?? facility?.energyUnit;
  return buildMeterUsageFacts(rows, { useConsumption, unit });
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
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: currency ? 2 : 1,
    minimumFractionDigits: currency ? 2 : 0,
    style: currency ? 'currency' : 'decimal',
    currency: currency ? 'USD' : undefined
  }).format(value || 0);
}

export function formatMeterGroupPeriodLabel(row: MeterGroupResultRow, period: MeterGroupResultsPeriod): string {
  return period === 'yearly' ? `FY ${row.periodLabel}` : row.periodLabel;
}

export function isMeterGroupWorkbenchTab(value: unknown): value is MeterGroupWorkbenchTabId {
  return value === 'monthly-table'
    || value === 'monthly-graph'
    || value === 'yearly-table'
    || value === 'yearly-graph';
}

function aggregateMeterGroupMonthlyRows(calendarizedMeters: readonly CalanderizedMeter[]): MeterGroupResultRow[] {
  const rowsByMonth = new Map<string, MeterGroupResultRow>();
  for (const monthlyData of calendarizedMeters.flatMap(calendarizedMeter => calendarizedMeter.monthlyData)) {
    const key = `${monthlyData.year}-${monthlyData.monthNumValue}`;
    const existing = rowsByMonth.get(key);
    if (existing) {
      rowsByMonth.set(key, addMonthlyDataToRow(existing, monthlyData));
    } else {
      rowsByMonth.set(key, monthlyDataToResultRow(monthlyData));
    }
  }
  return [...rowsByMonth.values()].sort((first, second) => first.sortValue - second.sortValue);
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

function monthlyDataToResultRow(monthlyData: MonthlyData): MeterGroupResultRow {
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

function addMonthlyDataToRow(row: MeterGroupResultRow, monthlyData: MonthlyData): MeterGroupResultRow {
  return {
    ...row,
    energyUse: row.energyUse + monthlyData.energyUse,
    energyConsumption: row.energyConsumption + monthlyData.energyConsumption,
    energyCost: row.energyCost + monthlyData.energyCost
  };
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

function usageFact(
  id: MeterUsageFactId,
  label: string,
  row: MeterGroupResultRow | undefined,
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
    valueLabel: formatUsageValue(meterGroupResultRowUtilityValue(row, options.useConsumption)),
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
    valueLabel: formatUsageValue(value),
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
  rowsByMonth: ReadonlyMap<number, MeterGroupResultRow>,
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
    total += meterGroupResultRowUtilityValue(row, useConsumption);
    count++;
  }
  return count === 12 ? total / 12 : undefined;
}

function monthIndexFromRow(row: MeterGroupResultRow): number {
  const [year, month] = row.periodKey.split('-').map(value => Number(value));
  if (Number.isFinite(year) && Number.isFinite(month)) {
    return year * 12 + month + 1;
  }
  const date = new Date(row.sortValue);
  return date.getFullYear() * 12 + date.getMonth() + 1;
}

function meterGroupResultRowUtilityValue(row: MeterGroupResultRow, useConsumption: boolean): number {
  return useConsumption ? row.energyConsumption : row.energyUse;
}

function formatUsageValue(value: number): string {
  return formatMeterGroupNumber(value);
}

function formatPercentChange(value: number, suffix: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMeterGroupNumber(value)}% ${suffix}`;
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

function sortGroupsForDisplay(first: IdbUtilityMeterGroup, second: IdbUtilityMeterGroup): number {
  const typeDifference = groupTypeRank(first) - groupTypeRank(second);
  return typeDifference || first.name.localeCompare(second.name);
}

function groupTypeRank(group: IdbUtilityMeterGroup): number {
  switch (group.groupType) {
    case 'Energy':
      return 0;
    case 'Water':
      return 1;
    default:
      return 2;
  }
}

function groupTone(group: IdbUtilityMeterGroup): MeterGroupSectionTone {
  switch (group.groupType) {
    case 'Energy':
      return 'energy';
    case 'Water':
      return 'water';
    default:
      return 'other';
  }
}

function sortMetersByName(first: IdbUtilityMeter, second: IdbUtilityMeter): number {
  return first.name.localeCompare(second.name);
}

function meterSourceColor(source: MeterSource): string {
  return UtilityColors[source]?.color ?? '';
}

function meterStatusLabel(statusCheck: MeterStatusCheck | undefined): string {
  switch (statusCheck?.status) {
    case 'good':
      return 'Valid';
    case 'warning':
      return 'Needs review';
    case 'error':
      return 'Action needed';
    case 'outdated':
      return 'Outdated';
    default:
      return 'Checking';
  }
}

function meterStatusTone(statusCheck: MeterStatusCheck | undefined): MeterCardStatusTone {
  switch (statusCheck?.status) {
    case 'good':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'outdated':
    default:
      return statusCheck ? 'warning' : 'info';
  }
}

function meterStatusIcon(statusCheck: MeterStatusCheck | undefined): string {
  switch (statusCheck?.status) {
    case 'good':
      return 'fa-circle-check';
    case 'warning':
      return 'fa-triangle-exclamation';
    case 'error':
      return 'fa-circle-xmark';
    case 'outdated':
      return 'fa-clock';
    default:
      return 'fa-circle-notch';
  }
}

function latestReadingLabel(statusCheck: MeterStatusCheck | undefined, readings: readonly IdbUtilityMeterData[]): string {
  if (statusCheck?.lastDateEntry && !statusCheck.hasNoData) {
    return formatMonthYear(statusCheck.lastDateEntry);
  }
  const latestReading = readings.reduce<IdbUtilityMeterData | undefined>((latest, reading) => {
    if (!latest) {
      return reading;
    }
    return readingDateValue(reading) > readingDateValue(latest) ? reading : latest;
  }, undefined);
  return latestReading ? formatMonthYear(new Date(latestReading.year, latestReading.month - 1, 1)) : 'No data';
}

function firstReadingLabel(readings: readonly IdbUtilityMeterData[]): string {
  const firstReading = readings.reduce<IdbUtilityMeterData | undefined>((earliest, reading) => {
    if (!earliest) {
      return reading;
    }
    return readingDateValue(reading) < readingDateValue(earliest) ? reading : earliest;
  }, undefined);
  return firstReading ? formatMonthYear(new Date(firstReading.year, firstReading.month - 1, 1)) : 'No data';
}

function readingDateValue(reading: IdbUtilityMeterData): number {
  return reading.year * 12 + reading.month;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function scopeLabel(scope: number): string {
  return ScopeOptions.find(option => option.value === scope)?.optionLabel ?? 'Not set';
}

function fuelLabel(meter: IdbUtilityMeter): string | undefined {
  if (meter.source !== 'Other Fuels' && meter.source !== 'Other Energy') {
    return undefined;
  }
  return meter.scope === 2 ? meter.vehicleFuel : meter.fuel;
}

function meterStatusIssueLabels(statusCheck: MeterStatusCheck | undefined): string[] {
  if (!statusCheck || statusCheck.status === 'good') {
    return [];
  }
  const labels: string[] = [];
  if (statusCheck.hasNoData) {
    labels.push('No data');
  }
  if (!statusCheck.isMeterValid) {
    labels.push('Invalid setup');
  }
  if (statusCheck.hasDuplicateEntries) {
    labels.push('Duplicates');
  }
  if (statusCheck.hasNegativeReadings) {
    labels.push('Negative readings');
  }
  if (statusCheck.isMissingData) {
    labels.push('Missing data');
  }
  if (statusCheck.hasNoCalendarizationMethod) {
    labels.push('No calendarization');
  }
  if (statusCheck.status === 'outdated') {
    labels.push('Outdated');
  } else if (!statusCheck.isDataCurrent && !statusCheck.hasNoData) {
    labels.push('Not current');
  }
  return labels;
}

function meterStatusActionSummaries(statusCheck: MeterStatusCheck | undefined): string[] {
  return statusCheck?.actions
    ?.filter((action: StatusCheckAction) => action.status !== 'good')
    .map(action => action.description)
    .slice(0, 2) ?? [];
}
