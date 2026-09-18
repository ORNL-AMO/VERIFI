/** Meter and meter-group workbench tabs, visibility rules, and navigation metadata. */
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { summarizeStatusAttention } from '@app/v1/status/status.dismissals';
import { StatusAttentionSummary, StatusItem } from '@app/v1/status/status.models';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

export type MeterWorkbenchTabId = 'settings' | 'readings' | 'bill-inspection' | 'monthly' | 'monthly-chart' | 'yearly' | 'quality';
export type MeterGroupWorkbenchTabId = 'monthly-table' | 'monthly-chart' | 'yearly';

export interface MeterWorkbenchTab {
  readonly id: MeterWorkbenchTabId;
  readonly label: string;
  readonly icon: IconName;
  readonly summary: string;
}

export type MeterWorkbenchTabAttention = Readonly<Partial<Record<MeterWorkbenchTabId, StatusAttentionSummary>>>;

export interface MeterGroupWorkbenchTab {
  readonly id: MeterGroupWorkbenchTabId;
  readonly label: string;
  readonly icon: IconName;
}

export const METER_WORKBENCH_TABS: ReadonlyArray<MeterWorkbenchTab> = [
  { id: 'settings', label: 'Settings', icon: 'settings', summary: 'Meter settings and assignment content is WIP.' },
  { id: 'readings', label: 'Readings', icon: 'table', summary: 'Meter reading and utility bill tables are WIP.' },
  { id: 'monthly', label: 'Monthly Table', icon: 'calendar', summary: 'Monthly calendarized data table.' },
  { id: 'monthly-chart', label: 'Monthly Chart', icon: 'chartLine', summary: 'Monthly calendarized data chart.' },
  { id: 'yearly', label: 'Yearly Data', icon: 'barChart', summary: 'Yearly meter table and chart.' },
  { id: 'bill-inspection', label: 'Bill Inspection', icon: 'monocle', summary: 'Inspect electricity charges against utility bill consumption, cost, and demand.' },
  { id: 'quality', label: 'Quality Report', icon: 'warning', summary: 'Review meter statistics, expected ranges, outliers, duplicate months, and time series.' }
];

export const METER_GROUP_WORKBENCH_TABS: ReadonlyArray<MeterGroupWorkbenchTab> = [
  { id: 'monthly-table', label: 'Monthly Table', icon: 'table' },
  { id: 'monthly-chart', label: 'Monthly Chart', icon: 'chartLine' },
  { id: 'yearly', label: 'Yearly Data', icon: 'barChart' }
];

export function meterWorkbenchTab(tabId: MeterWorkbenchTabId): MeterWorkbenchTab {
  return METER_WORKBENCH_TABS.find(tab => tab.id === tabId) ?? METER_WORKBENCH_TABS[0];
}

export function meterWorkbenchTabsForMeter(meter: IdbUtilityMeter | undefined): readonly MeterWorkbenchTab[] {
  return METER_WORKBENCH_TABS.filter(tab => {
    if (tab.id === 'monthly') {
      return shouldShowMeterMonthlyDataTab(meter);
    }
    if (tab.id === 'bill-inspection') {
      return shouldShowMeterBillInspectionTab(meter);
    }
    return true;
  });
}

export function buildMeterWorkbenchTabAttention(
  findings: readonly StatusItem[]
): MeterWorkbenchTabAttention {
  const attention: Partial<Record<MeterWorkbenchTabId, StatusAttentionSummary>> = {};
  METER_WORKBENCH_TABS.forEach(tab => {
    const tabFindings = findings.filter(finding => finding.destination.kind === 'meter-tab'
      && finding.destination.tab === tab.id);
    const summary = summarizeStatusAttention(tabFindings);
    if (summary.total > 0) attention[tab.id] = summary;
  });
  return attention;
}

export function shouldShowMeterMonthlyDataTab(meter: IdbUtilityMeter | undefined): boolean {
  return meter?.meterReadingDataApplication !== 'fullMonth';
}

export function shouldShowMeterBillInspectionTab(meter: IdbUtilityMeter | undefined): boolean {
  return meter?.source === 'Electricity' && (meter.charges?.length ?? 0) > 0;
}

export function isMeterGroupWorkbenchTab(value: unknown): value is MeterGroupWorkbenchTabId {
  return value === 'monthly-table'
    || value === 'monthly-chart'
    || value === 'yearly';
}
