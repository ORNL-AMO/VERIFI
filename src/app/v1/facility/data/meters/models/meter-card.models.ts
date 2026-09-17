/** Presentation-ready meter card data derived from meters, readings, and status checks. */
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { CalanderizedMeter } from '@data/models/calanderization';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ScopeOptions } from '@data/models/scopeOption';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { StatusCheckAction } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { UtilityColors } from '@shared/utilityColors';
import { buildMeterUsageFactsFromCalendarizedMeters, MeterUsageFactsView } from './meter-usage.models';

type MeterCardStatusTone = 'success' | 'warning' | 'danger' | 'info';

export interface MeterCardView {
  readonly meter: IdbUtilityMeter;
  readonly group?: IdbUtilityMeterGroup;
  readonly readingCount: number;
  readonly meterStatusCheck?: MeterStatusCheck;
  readonly sourceColor?: string;
  readonly sourceIcon?: IconName;
  readonly statusLabel?: string;
  readonly statusTone?: MeterCardStatusTone;
  readonly statusIcon?: IconName;
  readonly firstReadingLabel?: string;
  readonly latestReadingLabel?: string;
  readonly scopeLabel?: string;
  readonly fuelLabel?: string;
  readonly statusIssueLabels?: readonly string[];
  readonly statusActionSummaries?: readonly string[];
  readonly usageFacts?: MeterUsageFactsView;
}

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
        sourceIcon: meterSourceIcon(meter.source),
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

export function meterSourceIcon(source: MeterSource): IconName {
  switch (source) {
    case 'Electricity':
      return 'electricity';
    case 'Natural Gas':
      return 'naturalGas';
    case 'Other Fuels':
      return 'otherFuel';
    case 'Other Energy':
      return 'otherEnergy';
    case 'Water Intake':
      return 'waterIntake';
    case 'Water Discharge':
      return 'waterDischarge';
    default:
      return 'meter';
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

function meterStatusIcon(statusCheck: MeterStatusCheck | undefined): IconName {
  switch (statusCheck?.status) {
    case 'good':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'outdated':
      return 'clock';
    default:
      return 'loading';
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
