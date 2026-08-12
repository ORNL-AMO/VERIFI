import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';

export type P1MeterWorkbenchTab = 'setup' | 'readings' | 'monthlyData';
export type P1MetersHomeView = 'meters' | 'analysis-groups';
export type P1MeterGroupView = 'manage' | 'edit' | 'table' | 'chart';
export type P1BillEditorMode = 'add' | 'edit';
export type P1MeterStatusFilter = 'all' | 'good' | 'warning' | 'error' | 'outdated' | 'noData';
export type P1MeterGroupFilter = 'all' | 'grouped' | 'ungrouped' | string;

export interface P1MeterRow {
  meter: IdbUtilityMeter;
  status?: MeterStatusCheck;
  latestReading?: IdbUtilityMeterData;
  readingCount: number;
  group?: IdbUtilityMeterGroup;
}

export interface P1MeterFilterState {
  search: string;
  source: 'all' | MeterSource;
  status: P1MeterStatusFilter;
  group: P1MeterGroupFilter;
}

export interface P1MeterGroupBuckets {
  energy: IdbUtilityMeterGroup[];
  water: IdbUtilityMeterGroup[];
  other: IdbUtilityMeterGroup[];
  ungroupedMeters: IdbUtilityMeter[];
}

export interface P1MeterGroupSummary {
  meter: IdbUtilityMeter;
  latestReading?: IdbUtilityMeterData;
  readingCount: number;
  totalEnergyUse: number;
  totalVolume: number;
  totalCost: number;
}

export function buildP1MeterRows(
  meters: readonly IdbUtilityMeter[],
  meterData: readonly IdbUtilityMeterData[],
  groups: readonly IdbUtilityMeterGroup[],
  statuses: readonly MeterStatusCheck[] = []
): P1MeterRow[] {
  return meters.map(meter => {
    const readings = meterData.filter(data => data.meterId === meter.guid);
    return {
      meter,
      status: statuses.find(status => status.meterId === meter.guid),
      latestReading: getLatestP1MeterReading(readings),
      readingCount: readings.length,
      group: groups.find(group => group.guid === meter.groupId)
    };
  }).sort((first, second) => first.meter.name.localeCompare(second.meter.name));
}

export function filterP1MeterRows(rows: readonly P1MeterRow[], filters: P1MeterFilterState): P1MeterRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(row => {
    const meter = row.meter;
    const matchesSearch = !search
      || meter.name?.toLowerCase().includes(search)
      || meter.source?.toLowerCase().includes(search)
      || row.group?.name?.toLowerCase().includes(search)
      || meter.location?.toLowerCase().includes(search)
      || meter.supplier?.toLowerCase().includes(search);
    const matchesSource = filters.source === 'all' || meter.source === filters.source;
    const matchesStatus = filters.status === 'all'
      || (filters.status === 'noData' ? row.readingCount === 0 : row.status?.status === filters.status);
    const matchesGroup = filters.group === 'all'
      || (filters.group === 'grouped' ? !!meter.groupId : false)
      || (filters.group === 'ungrouped' ? !meter.groupId : false)
      || meter.groupId === filters.group;
    return matchesSearch && matchesSource && matchesStatus && matchesGroup;
  });
}

export function countP1MeterIssues(statuses: readonly MeterStatusCheck[] = []): number {
  return statuses.filter(status => status.status !== 'good').length;
}

export function buildP1MeterGroupBuckets(
  meters: readonly IdbUtilityMeter[],
  groups: readonly IdbUtilityMeterGroup[]
): P1MeterGroupBuckets {
  return {
    energy: groups.filter(group => group.groupType === 'Energy').sort(sortByName),
    water: groups.filter(group => group.groupType === 'Water').sort(sortByName),
    other: groups.filter(group => group.groupType === 'Other').sort(sortByName),
    ungroupedMeters: meters.filter(meter => !meter.groupId).sort(sortMetersByName)
  };
}

export function summarizeP1GroupMeters(
  group: IdbUtilityMeterGroup | undefined,
  meters: readonly IdbUtilityMeter[],
  meterData: readonly IdbUtilityMeterData[]
): P1MeterGroupSummary[] {
  const groupMeters = meters
    .filter(meter => group ? meter.groupId === group.guid : !meter.groupId)
    .sort(sortMetersByName);
  return groupMeters.map(meter => {
    const readings = meterData.filter(data => data.meterId === meter.guid);
    return {
      meter,
      latestReading: getLatestP1MeterReading(readings),
      readingCount: readings.length,
      totalEnergyUse: sumNumber(readings, 'totalEnergyUse'),
      totalVolume: sumNumber(readings, 'totalVolume'),
      totalCost: sumNumber(readings, 'totalCost')
    };
  });
}

export function getLatestP1MeterReading(readings: readonly IdbUtilityMeterData[]): IdbUtilityMeterData | undefined {
  return readings.reduce<IdbUtilityMeterData | undefined>((latest, reading) => {
    if (!latest) {
      return reading;
    }
    return readingDateValue(reading) > readingDateValue(latest) ? reading : latest;
  }, undefined);
}

export function readingDateValue(reading: IdbUtilityMeterData): number {
  return new Date(reading.year, reading.month - 1, reading.day || 1).getTime();
}

function sumNumber(readings: readonly IdbUtilityMeterData[], key: keyof IdbUtilityMeterData): number {
  return readings.reduce((sum, reading) => {
    const value = reading[key];
    return typeof value === 'number' && Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function sortByName(first: IdbUtilityMeterGroup, second: IdbUtilityMeterGroup): number {
  return first.name.localeCompare(second.name);
}

function sortMetersByName(first: IdbUtilityMeter, second: IdbUtilityMeter): number {
  return first.name.localeCompare(second.name);
}
