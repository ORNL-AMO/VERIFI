import { AllSources, EnergySources, MeterSource, WaterSources } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ScopeOptions } from '@data/models/scopeOption';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { StatusCheckAction } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { UtilityColors } from '@shared/utilityColors';

export type MeterWorkbenchTabId = 'settings' | 'readings' | 'monthly' | 'yearly' | 'quality';
export type MetersDashboardMode = 'meters' | 'grouping';
export type MeterGroupSectionTone = 'energy' | 'water' | 'other' | 'ungrouped';
export type MeterGroupDropTargetId = string | 'ungrouped';
export type MeterGroupType = IdbUtilityMeterGroup['groupType'];
export type MeterCardStatusTone = 'success' | 'warning' | 'danger' | 'info';
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
  groups: readonly IdbUtilityMeterGroup[],
  meterStatusChecks: readonly MeterStatusCheck[] = []
): MeterCardView[] {
  return [...meters]
    .sort(sortMetersByName)
    .map(meter => {
      const readings = meterData.filter(reading => reading.meterId === meter.guid);
      const meterStatusCheck = meterStatusChecks.find(statusCheck => statusCheck.meterId === meter.guid);
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
        statusActionSummaries: meterStatusActionSummaries(meterStatusCheck)
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
