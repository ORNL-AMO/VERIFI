import { AllSources, EnergySources, MeterSource, WaterSources } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

export type MeterWorkbenchTabId = 'settings' | 'readings' | 'monthly' | 'yearly' | 'quality';
export type MetersDashboardMode = 'meters' | 'grouping';
export type MeterGroupSectionTone = 'energy' | 'water' | 'other' | 'ungrouped';
export type MeterGroupDropTargetId = string | 'ungrouped';
export type MeterGroupType = IdbUtilityMeterGroup['groupType'];
export type MetersDashboardSlideout =
  | { readonly kind: 'add-meter' }
  | { readonly kind: 'add-group' }
  | { readonly kind: 'edit-group'; readonly group: IdbUtilityMeterGroup; readonly assignedMeterCount: number }
  | { readonly kind: 'move-meter'; readonly card: MeterCardView };
export type MetersGroupingSlideout = Exclude<MetersDashboardSlideout, { readonly kind: 'add-meter' }>;

export const UNGROUPED_DROP_TARGET_ID = 'ungrouped';
export const METER_SOURCES: ReadonlyArray<MeterSource> = AllSources;
export const METER_GROUP_TYPES: ReadonlyArray<MeterGroupType> = ['Energy', 'Water', 'Other'];
export const METER_DASHBOARD_MODES: ReadonlyArray<{
  readonly id: MetersDashboardMode;
  readonly label: string;
  readonly icon: string;
}> = [
  { id: 'meters', label: 'Meters', icon: 'fa-gauge-high' },
  { id: 'grouping', label: 'Grouping', icon: 'fa-layer-group' }
];

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
  return METER_WORKBENCH_TABS.find(tab => tab.id === tabId)?.label ?? 'Settings';
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
