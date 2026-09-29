import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getIsEnergyUnit } from '@shared/sharedHelperFunctions';

export interface ImportReadingRangeSummary {
  readonly count: number;
  readonly start?: Date;
  readonly end?: Date;
}

export interface ImportMeterReadingIssue {
  readonly index: number;
  readonly key: string;
  readonly reading: IdbUtilityMeterData;
  readonly dateLabel: string;
  readonly primaryValue?: number;
  readonly messages: readonly string[];
  readonly excluded: boolean;
}

export interface ImportMeterReadingComparison {
  readonly importedReading: IdbUtilityMeterData;
  readonly currentReading: IdbUtilityMeterData;
  readonly readDate: Date;
  readonly currentValue?: number;
  readonly importedValue?: number;
  readonly difference?: number;
  readonly percentageDifference?: number;
  readonly changedFields: readonly string[];
}

export interface ImportMeterReadingSummaryRow {
  readonly meterIndex: number;
  readonly meter: IdbUtilityMeter;
  readonly facilityName: string;
  readonly primaryUnit: string;
  readonly newReadings: ImportReadingRangeSummary;
  readonly invalidReadings: ImportReadingRangeSummary;
  readonly existingReadings: ImportReadingRangeSummary;
  readonly invalidReadingDetails: readonly ImportMeterReadingIssue[];
  readonly comparisons: readonly ImportMeterReadingComparison[];
  readonly keepExisting: boolean;
}

export interface BuildImportMeterReadingReviewOptions {
  readonly meters: readonly IdbUtilityMeter[];
  readonly readings: readonly IdbUtilityMeterData[];
  readonly facilities: readonly IdbFacility[];
  readonly currentReadings: readonly IdbUtilityMeterData[];
  readonly excludedReadingIds: readonly (number | string)[];
  readonly skipExistingMeterIds: readonly string[];
}

interface IndexedReading {
  readonly index: number;
  readonly reading: IdbUtilityMeterData;
}

const COMPARISON_FIELDS: ReadonlyArray<{ key: keyof IdbUtilityMeterData; label: string; boolean?: boolean }> = [
  { key: 'totalVolume', label: 'Total volume' },
  { key: 'totalEnergyUse', label: 'Energy use' },
  { key: 'totalCost', label: 'Total cost' },
  { key: 'totalRealDemand', label: 'Real demand' },
  { key: 'totalBilledDemand', label: 'Billed demand' },
  { key: 'powerFactor', label: 'Power factor' },
  { key: 'heatCapacity', label: 'Heat capacity' },
  { key: 'vehicleFuelEfficiency', label: 'Vehicle fuel efficiency' },
  { key: 'isEstimated', label: 'Estimated status', boolean: true },
  { key: 'commodityCharge', label: 'Commodity charge' },
  { key: 'deliveryCharge', label: 'Delivery charge' },
  { key: 'nonEnergyCharge', label: 'Non-energy charge' },
  { key: 'block1Consumption', label: 'Block 1 consumption' },
  { key: 'block1ConsumptionCharge', label: 'Block 1 consumption charge' },
  { key: 'block2Consumption', label: 'Block 2 consumption' },
  { key: 'block2ConsumptionCharge', label: 'Block 2 consumption charge' },
  { key: 'block3Consumption', label: 'Block 3 consumption' },
  { key: 'block3ConsumptionCharge', label: 'Block 3 consumption charge' },
  { key: 'otherConsumption', label: 'Other consumption' },
  { key: 'otherConsumptionCharge', label: 'Other consumption charge' },
  { key: 'onPeakAmount', label: 'On-peak amount' },
  { key: 'onPeakCharge', label: 'On-peak charge' },
  { key: 'offPeakAmount', label: 'Off-peak amount' },
  { key: 'offPeakCharge', label: 'Off-peak charge' },
  { key: 'transmissionAndDeliveryCharge', label: 'Transmission and delivery charge' },
  { key: 'powerFactorCharge', label: 'Power factor charge' },
  { key: 'localSalesTax', label: 'Local sales tax' },
  { key: 'stateSalesTax', label: 'State sales tax' },
  { key: 'latePayment', label: 'Late payment' },
  { key: 'otherCharge', label: 'Other charge' },
  { key: 'demandUsage', label: 'Demand usage' },
  { key: 'demandCharge', label: 'Demand charge' }
];

export function buildImportMeterReadingReview(
  options: BuildImportMeterReadingReviewOptions
): ImportMeterReadingSummaryRow[] {
  const excludedIds = new Set(options.excludedReadingIds.map(String));
  const skippedMeters = new Set(options.skipExistingMeterIds);
  const currentByPeriod = new Map<string, IdbUtilityMeterData>();
  options.currentReadings.forEach(reading => {
    const key = meterReadingPeriodKey(reading);
    if (!currentByPeriod.has(key)) currentByPeriod.set(key, reading);
  });

  return options.meters.reduce<ImportMeterReadingSummaryRow[]>((rows, meter, meterIndex) => {
    if (meter.skipImport) return rows;
    const meterReadings = options.readings
      .map((reading, index): IndexedReading => ({ reading, index }))
      .filter(entry => entry.reading.meterId === meter.guid);
    const newEntries: IndexedReading[] = [];
    const invalidEntries: IndexedReading[] = [];
    const existingEntries: IndexedReading[] = [];
    const invalidReadingDetails: ImportMeterReadingIssue[] = [];
    const comparisons: ImportMeterReadingComparison[] = [];

    meterReadings.forEach(entry => {
      const messages = getImportMeterReadingIssues(entry.reading);
      if (messages.length) {
        invalidEntries.push(entry);
        invalidReadingDetails.push({
          index: entry.index,
          key: meterReadingEntityKey(entry.reading),
          reading: entry.reading,
          dateLabel: formatSuppliedReadingDate(entry.reading),
          primaryValue: primaryReadingValue(meter, entry.reading),
          messages,
          excluded: excludedIds.has(meterReadingEntityKey(entry.reading))
        });
        return;
      }

      const current = currentByPeriod.get(meterReadingPeriodKey(entry.reading));
      if (!current) {
        newEntries.push(entry);
        return;
      }

      existingEntries.push(entry);
      const comparison = compareMeterReadings(meter, current, entry.reading);
      if (comparison) comparisons.push(comparison);
    });

    rows.push({
      meterIndex,
      meter,
      facilityName: options.facilities.find(facility => facility.guid === meter.facilityId)?.name ?? 'Unknown facility',
      primaryUnit: primaryReadingUnit(meter),
      newReadings: rangeSummary(newEntries),
      invalidReadings: rangeSummary(invalidEntries),
      existingReadings: rangeSummary(existingEntries),
      invalidReadingDetails,
      comparisons,
      keepExisting: skippedMeters.has(meter.guid)
    });
    return rows;
  }, []);
}

export function getImportMeterReadingIssues(reading: IdbUtilityMeterData): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(reading.year) || reading.year <= 1900) issues.push('Year must be a whole number after 1900.');
  if (!Number.isInteger(reading.month) || reading.month < 1 || reading.month > 12) issues.push('Month must be between 1 and 12.');
  if (!Number.isInteger(reading.day) || reading.day < 1 || reading.day > 31) issues.push('Day must be between 1 and 31.');
  const numericValues: Array<[unknown, string]> = [
    [reading.totalEnergyUse, 'Energy use'],
    [reading.totalVolume, 'Total volume'],
    [reading.totalImportConsumption, 'Imported consumption']
  ];
  numericValues.forEach(([value, label]) => {
    if (!isMissing(value) && !Number.isFinite(Number(value))) issues.push(`${label} must be a number.`);
  });
  return issues;
}

export function isImportMeterReadingValid(reading: IdbUtilityMeterData): boolean {
  return getImportMeterReadingIssues(reading).length === 0;
}

export function sameMeterReadingPeriod(left: IdbUtilityMeterData, right: IdbUtilityMeterData): boolean {
  return left.meterId === right.meterId && left.year === right.year &&
    left.month === right.month && left.day === right.day;
}

export function meterReadingEntityKey(reading: IdbUtilityMeterData): string {
  return String(reading.id ?? reading.guid);
}

function compareMeterReadings(
  meter: IdbUtilityMeter,
  current: IdbUtilityMeterData,
  imported: IdbUtilityMeterData
): ImportMeterReadingComparison | undefined {
  const primaryField = primaryReadingField(meter);
  const currentValue = finiteNumber(current[primaryField]);
  const importedValue = finiteNumber(imported[primaryField]);
  const primaryChanged = valuesDiffer(current[primaryField], imported[primaryField]);
  const changedFields = COMPARISON_FIELDS
    .filter(field => field.key !== primaryField && valuesDiffer(current[field.key], imported[field.key], field.boolean))
    .map(field => field.label);
  changedFields.push(...changedChargeFields(meter, current, imported));
  if (!primaryChanged && changedFields.length === 0) return undefined;
  const difference = currentValue !== undefined && importedValue !== undefined
    ? Math.abs(importedValue - currentValue)
    : undefined;
  const percentageDifference = difference !== undefined && currentValue !== undefined && currentValue !== 0
    ? difference / Math.abs(currentValue) * 100
    : undefined;
  return {
    importedReading: imported,
    currentReading: current,
    readDate: readingDate(imported)!,
    currentValue,
    importedValue,
    difference,
    percentageDifference,
    changedFields
  };
}

function changedChargeFields(
  meter: IdbUtilityMeter,
  current: IdbUtilityMeterData,
  imported: IdbUtilityMeterData
): string[] {
  const currentCharges = new Map((current.charges ?? []).map(charge => [charge.chargeGuid, charge]));
  const importedCharges = new Map((imported.charges ?? []).map(charge => [charge.chargeGuid, charge]));
  const chargeIds = new Set([...currentCharges.keys(), ...importedCharges.keys()]);
  const names = new Map((meter.charges ?? []).map(charge => [charge.guid, charge.name]));
  const fields: string[] = [];
  chargeIds.forEach(chargeId => {
    const currentCharge = currentCharges.get(chargeId);
    const importedCharge = importedCharges.get(chargeId);
    const name = names.get(chargeId) ?? 'Meter charge';
    if (valuesDiffer(currentCharge?.chargeAmount, importedCharge?.chargeAmount)) fields.push(`${name} amount`);
    if (valuesDiffer(currentCharge?.chargeUsage, importedCharge?.chargeUsage)) fields.push(`${name} usage`);
  });
  return fields;
}

function rangeSummary(entries: readonly IndexedReading[]): ImportReadingRangeSummary {
  const dates = entries.map(entry => readingDate(entry.reading)).filter((date): date is Date => !!date);
  if (!dates.length) return { count: entries.length };
  const timestamps = dates.map(date => date.getTime());
  return {
    count: entries.length,
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps))
  };
}

function readingDate(reading: IdbUtilityMeterData): Date | undefined {
  if (!Number.isInteger(reading.year) || !Number.isInteger(reading.month) || !Number.isInteger(reading.day)) return undefined;
  if (reading.year <= 1900 || reading.month < 1 || reading.month > 12 || reading.day < 1 || reading.day > 31) return undefined;
  return new Date(reading.year, reading.month - 1, reading.day);
}

function meterReadingPeriodKey(reading: IdbUtilityMeterData): string {
  return `${reading.meterId}:${reading.year}:${reading.month}:${reading.day}`;
}

function primaryReadingField(meter: IdbUtilityMeter): 'totalVolume' | 'totalEnergyUse' {
  return meter.scope === 2 || getIsEnergyUnit(meter.startingUnit) === false ? 'totalVolume' : 'totalEnergyUse';
}

function primaryReadingValue(meter: IdbUtilityMeter, reading: IdbUtilityMeterData): number | undefined {
  return finiteNumber(reading[primaryReadingField(meter)]);
}

function primaryReadingUnit(meter: IdbUtilityMeter): string {
  if (meter.scope === 2) {
    return meter.vehicleCollectionType === 1
      ? meter.vehicleCollectionUnit ?? meter.startingUnit
      : meter.vehicleDistanceUnit ?? meter.startingUnit;
  }
  return getIsEnergyUnit(meter.startingUnit) === false
    ? meter.startingUnit
    : meter.startingUnit ?? meter.energyUnit;
}

function valuesDiffer(left: unknown, right: unknown, boolean = false): boolean {
  if (isMissing(left) && isMissing(right)) return false;
  if (boolean) return Boolean(left) !== Boolean(right);
  const leftNumber = finiteNumber(left);
  const rightNumber = finiteNumber(right);
  if (leftNumber !== undefined && rightNumber !== undefined) return leftNumber !== rightNumber;
  return left !== right;
}

function finiteNumber(value: unknown): number | undefined {
  if (isMissing(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

function formatSuppliedReadingDate(reading: IdbUtilityMeterData): string {
  return `${formatDatePart(reading.year, 4)}-${formatDatePart(reading.month, 2)}-${formatDatePart(reading.day, 2)}`;
}

function formatDatePart(value: unknown, width: number): string {
  return Number.isFinite(Number(value)) ? String(value).padStart(width, '0') : '?'.repeat(width);
}
