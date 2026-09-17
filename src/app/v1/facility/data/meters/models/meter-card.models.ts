/** Presentation-ready meter card data derived from meters, readings, and status checks. */
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { CalanderizedMeter } from '@data/models/calanderization';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { ScopeOptions } from '@data/models/scopeOption';
import { StatusItem } from '@app/v1/status/status.models';
import { UtilityColors } from '@shared/utilityColors';
import { buildMeterUsageFactsFromCalendarizedMeters, MeterUsageFactsView } from './meter-usage.models';

type MeterCardStatusTone = 'success' | 'warning' | 'danger' | 'info';

export interface MeterCardView {
  readonly meter: IdbUtilityMeter;
  readonly group?: IdbUtilityMeterGroup;
  readonly readingCount: number;
  readonly statusFindings?: readonly StatusItem[];
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
  statusFindings: readonly StatusItem[] = [],
  facility?: IdbFacility,
  calendarizedMeters: readonly CalanderizedMeter[] = [],
  statusReady = true
): MeterCardView[] {
  return [...meters]
    .sort(sortMetersByName)
    .map(meter => {
      const readings = meterData.filter(reading => reading.meterId === meter.guid);
      const meterFindings = statusFindings.filter(finding => finding.entity.kind === 'meter' && finding.entity.guid === meter.guid);
      const meterCalendarizedMeters = calendarizedMeters.filter(calendarizedMeter => calendarizedMeter.meter.guid === meter.guid);
      return {
        meter,
        group: groups.find(group => group.guid === meter.groupId),
        readingCount: readings.length,
        statusFindings: meterFindings,
        sourceColor: meterSourceColor(meter.source),
        sourceIcon: meterSourceIcon(meter.source),
        statusLabel: meterStatusLabel(meterFindings, statusReady),
        statusTone: meterStatusTone(meterFindings, statusReady),
        statusIcon: meterStatusIcon(meterFindings, statusReady),
        firstReadingLabel: firstReadingLabel(readings),
        latestReadingLabel: latestReadingLabel(readings),
        scopeLabel: scopeLabel(meter.scope),
        fuelLabel: fuelLabel(meter),
        statusIssueLabels: meterStatusIssueLabels(meterFindings),
        statusActionSummaries: meterFindings.slice(0, 2).map(finding => finding.description),
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

function meterStatusLabel(findings: readonly StatusItem[], ready: boolean): string {
  if (!ready) return 'Checking';
  if (findings.some(finding => finding.severity === 'error')) return 'Action needed';
  if (findings.some(finding => finding.severity === 'warning')) return 'Needs review';
  return 'Valid';
}

function meterStatusTone(findings: readonly StatusItem[], ready: boolean): MeterCardStatusTone {
  if (!ready) return 'info';
  if (findings.some(finding => finding.severity === 'error')) return 'danger';
  if (findings.some(finding => finding.severity === 'warning')) return 'warning';
  return 'success';
}

function meterStatusIcon(findings: readonly StatusItem[], ready: boolean): IconName {
  if (!ready) return 'loading';
  if (findings.some(finding => finding.severity === 'error')) return 'danger';
  if (findings.some(finding => finding.severity === 'warning')) return findings.every(finding => finding.category === 'currency') ? 'clock' : 'warning';
  return 'success';
}

function latestReadingLabel(readings: readonly IdbUtilityMeterData[]): string {
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

function meterStatusIssueLabels(findings: readonly StatusItem[]): string[] {
  const labels: Partial<Record<StatusItem['code'], string>> = {
    'meter.data.missing': 'No data', 'meter.configuration.invalid': 'Invalid setup', 'meter.data.duplicate-date': 'Duplicates',
    'meter.data.negative': 'Negative readings', 'meter.data.gap': 'Missing data', 'meter.calendarization.missing': 'No calendarization',
    'meter.currency.stale': 'Outdated', 'meter.currency.behind-facility': 'Not current',
    'meter.quality.consumption-outlier': 'Consumption outliers', 'meter.quality.cost-outlier': 'Cost outliers'
  };
  return findings.map(finding => labels[finding.code]).filter((label): label is string => !!label);
}
