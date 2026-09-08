import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

export type MeterWorkbenchTabId = 'settings' | 'readings' | 'monthly' | 'yearly' | 'quality';
export type MeterGroupSectionTone = 'energy' | 'water' | 'other' | 'ungrouped';

export interface MeterWorkbenchTab {
  readonly id: MeterWorkbenchTabId;
  readonly label: string;
  readonly icon: string;
  readonly summary: string;
}

export interface MeterCardView {
  readonly meter: IdbUtilityMeter;
  readonly group?: IdbUtilityMeterGroup;
  readonly readingCount: number;
}

export interface MeterGroupSectionView {
  readonly id: string;
  readonly label: string;
  readonly tone: MeterGroupSectionTone;
  readonly group?: IdbUtilityMeterGroup;
  readonly meters: readonly MeterCardView[];
}

export const METER_WORKBENCH_TABS: ReadonlyArray<MeterWorkbenchTab> = [
  { id: 'settings', label: 'Settings', icon: 'fa-sliders', summary: 'Meter settings and assignment content is WIP.' },
  { id: 'readings', label: 'Readings', icon: 'fa-table-list', summary: 'Meter reading and utility bill tables are WIP.' },
  { id: 'monthly', label: 'Monthly Data', icon: 'fa-calendar-days', summary: 'Monthly calendarized data review is WIP.' },
  { id: 'yearly', label: 'Yearly Data', icon: 'fa-chart-column', summary: 'Yearly meter rollups are WIP.' },
  { id: 'quality', label: 'Quality Report', icon: 'fa-triangle-exclamation', summary: 'Meter data quality report content is WIP.' }
];

export function buildMeterCards(
  meters: readonly IdbUtilityMeter[],
  meterData: readonly IdbUtilityMeterData[],
  groups: readonly IdbUtilityMeterGroup[]
): MeterCardView[] {
  return [...meters]
    .sort(sortMetersByName)
    .map(meter => ({
      meter,
      group: groups.find(group => group.guid === meter.groupId),
      readingCount: meterData.filter(reading => reading.meterId === meter.guid).length
    }));
}

export function buildMeterGroupSections(
  meters: readonly IdbUtilityMeter[],
  meterData: readonly IdbUtilityMeterData[],
  groups: readonly IdbUtilityMeterGroup[]
): MeterGroupSectionView[] {
  const cards = buildMeterCards(meters, meterData, groups);
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
  return ungroupedMeters.length === 0
    ? groupedSections
    : [
      ...groupedSections,
      {
        id: 'ungrouped',
        label: 'Ungrouped',
        tone: 'ungrouped',
        meters: ungroupedMeters
      }
    ];
}

export function meterTabLabel(tabId: MeterWorkbenchTabId): string {
  return METER_WORKBENCH_TABS.find(tab => tab.id === tabId)?.label ?? 'Settings';
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
