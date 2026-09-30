import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

export interface ImportPredictorReadingRangeSummary {
  readonly count: number;
  readonly start?: Date;
  readonly end?: Date;
}

export interface ImportPredictorReadingIssue {
  readonly index: number;
  readonly key: string;
  readonly reading: IdbPredictorData;
  readonly monthLabel: string;
  readonly amount?: number;
  readonly messages: readonly string[];
  readonly excluded: boolean;
}

export interface ImportPredictorReadingComparison {
  readonly importedReading: IdbPredictorData;
  readonly currentReading: IdbPredictorData;
  readonly readMonth: Date;
  readonly currentValue: number;
  readonly importedValue: number;
  readonly difference: number;
  readonly percentageDifference?: number;
}

export interface ImportPredictorReadingSummaryRow {
  readonly predictorIndex: number;
  readonly predictor: IdbPredictor;
  readonly facilityName: string;
  readonly unit?: string;
  readonly newReadings: ImportPredictorReadingRangeSummary;
  readonly invalidReadings: ImportPredictorReadingRangeSummary;
  readonly existingReadings: ImportPredictorReadingRangeSummary;
  readonly invalidReadingDetails: readonly ImportPredictorReadingIssue[];
  readonly comparisons: readonly ImportPredictorReadingComparison[];
  readonly keepExisting: boolean;
}

export interface BuildImportPredictorReadingReviewOptions {
  readonly predictors: readonly IdbPredictor[];
  readonly readings: readonly IdbPredictorData[];
  readonly facilities: readonly IdbFacility[];
  readonly currentReadings: readonly IdbPredictorData[];
  readonly excludedReadingIds: readonly (number | string)[];
  readonly skipExistingPredictorIds: readonly string[];
}

interface IndexedReading {
  readonly index: number;
  readonly reading: IdbPredictorData;
}

export function buildImportPredictorReadingReview(
  options: BuildImportPredictorReadingReviewOptions
): ImportPredictorReadingSummaryRow[] {
  const excludedIds = new Set(options.excludedReadingIds.map(String));
  const skippedPredictors = new Set(options.skipExistingPredictorIds);
  const currentByPeriod = new Map<string, IdbPredictorData>();
  options.currentReadings.forEach(reading => {
    const key = predictorReadingPeriodKey(reading);
    if (key && !currentByPeriod.has(key)) currentByPeriod.set(key, reading);
  });

  return options.predictors.reduce<ImportPredictorReadingSummaryRow[]>((rows, predictor, predictorIndex) => {
    if (predictor.skipImport) return rows;
    const predictorReadings = options.readings
      .map((reading, index): IndexedReading => ({ reading, index }))
      .filter(entry => entry.reading.predictorId === predictor.guid);
    const originalPeriodCounts = periodCounts(predictorReadings);
    const activePeriodCounts = periodCounts(predictorReadings.filter(entry =>
      !isExcluded(entry, excludedIds)));
    const newEntries: IndexedReading[] = [];
    const invalidEntries: IndexedReading[] = [];
    const existingEntries: IndexedReading[] = [];
    const invalidReadingDetails: ImportPredictorReadingIssue[] = [];
    const comparisons: ImportPredictorReadingComparison[] = [];

    predictorReadings.forEach(entry => {
      const excluded = isExcluded(entry, excludedIds);
      const messages = [...getImportPredictorReadingIssues(entry.reading, predictor)];
      const period = predictorReadingPeriodKey(entry.reading);
      const duplicateCount = period
        ? (excluded ? originalPeriodCounts.get(period) : activePeriodCounts.get(period)) ?? 0
        : 0;
      if (duplicateCount > 1) messages.push('Only one reading can be imported for this predictor and month.');
      if (messages.length) {
        invalidEntries.push(entry);
        invalidReadingDetails.push({
          index: entry.index,
          key: predictorReadingEntityKey(entry.reading, entry.index),
          reading: entry.reading,
          monthLabel: formatSuppliedPredictorMonth(entry.reading),
          amount: finiteNumber(entry.reading.amount),
          messages,
          excluded
        });
        return;
      }

      const current = period ? currentByPeriod.get(period) : undefined;
      if (!current) {
        newEntries.push(entry);
        return;
      }

      existingEntries.push(entry);
      const comparison = comparePredictorReadings(current, entry.reading);
      if (comparison) comparisons.push(comparison);
    });

    rows.push({
      predictorIndex,
      predictor,
      facilityName: options.facilities.find(facility => facility.guid === predictor.facilityId)?.name ?? 'Unknown facility',
      unit: predictor.unit,
      newReadings: rangeSummary(newEntries),
      invalidReadings: rangeSummary(invalidEntries),
      existingReadings: rangeSummary(existingEntries),
      invalidReadingDetails,
      comparisons,
      keepExisting: skippedPredictors.has(predictor.guid)
    });
    return rows;
  }, []);
}

export function getImportPredictorReadingIssues(
  reading: IdbPredictorData,
  predictor: IdbPredictor
): string[] {
  const issues: string[] = [];
  if (!Number.isInteger(reading.year) || reading.year <= 0) issues.push('Year must be a positive whole number.');
  if (!Number.isInteger(reading.month) || reading.month < 1 || reading.month > 12) {
    issues.push('Month must be between 1 and 12.');
  }
  if (!Number.isFinite(reading.amount)) issues.push('Value must be a number.');
  if (Number.isFinite(reading.amount) && reading.amount < 0 && !predictor.canBeNegative) {
    issues.push('Negative values are not allowed for this predictor.');
  }
  return issues;
}

export function isImportPredictorReadingValid(
  reading: IdbPredictorData,
  predictor: IdbPredictor
): boolean {
  return getImportPredictorReadingIssues(reading, predictor).length === 0;
}

export function samePredictorReadingPeriod(left: IdbPredictorData, right: IdbPredictorData): boolean {
  return left.predictorId === right.predictorId && left.year === right.year && left.month === right.month;
}

export function predictorReadingEntityKey(reading: IdbPredictorData, index?: number): string {
  const key = String(reading.id ?? reading.guid);
  return index === undefined ? key : `${key}:${index}`;
}

function comparePredictorReadings(
  current: IdbPredictorData,
  imported: IdbPredictorData
): ImportPredictorReadingComparison | undefined {
  const currentValue = finiteNumber(current.amount);
  const importedValue = finiteNumber(imported.amount);
  const readMonth = predictorReadingDate(imported);
  if (currentValue === undefined || importedValue === undefined || !readMonth || currentValue === importedValue) return undefined;
  const difference = Math.abs(importedValue - currentValue);
  return {
    importedReading: imported,
    currentReading: current,
    readMonth,
    currentValue,
    importedValue,
    difference,
    percentageDifference: currentValue === 0 ? undefined : difference / Math.abs(currentValue) * 100
  };
}

function periodCounts(entries: readonly IndexedReading[]): Map<string, number> {
  return entries.reduce((counts, entry) => {
    const key = predictorReadingPeriodKey(entry.reading);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function isExcluded(entry: IndexedReading, excludedIds: ReadonlySet<string>): boolean {
  return excludedIds.has(predictorReadingEntityKey(entry.reading, entry.index))
    || excludedIds.has(predictorReadingEntityKey(entry.reading));
}

function rangeSummary(entries: readonly IndexedReading[]): ImportPredictorReadingRangeSummary {
  const dates = entries.map(entry => predictorReadingDate(entry.reading)).filter((date): date is Date => !!date);
  if (!dates.length) return { count: entries.length };
  const timestamps = dates.map(date => date.getTime());
  return {
    count: entries.length,
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps))
  };
}

function predictorReadingDate(reading: Pick<IdbPredictorData, 'year' | 'month'>): Date | undefined {
  if (!Number.isInteger(reading.year) || reading.year <= 0) return undefined;
  if (!Number.isInteger(reading.month) || reading.month < 1 || reading.month > 12) return undefined;
  return new Date(reading.year, reading.month - 1, 1);
}

function predictorReadingPeriodKey(reading: Pick<IdbPredictorData, 'predictorId' | 'year' | 'month'>): string | undefined {
  return predictorReadingDate(reading) ? `${reading.predictorId}:${reading.year}:${reading.month}` : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function formatSuppliedPredictorMonth(reading: Pick<IdbPredictorData, 'year' | 'month'>): string {
  const year = Number.isFinite(Number(reading.year)) ? String(reading.year).padStart(4, '0') : '????';
  const month = Number.isFinite(Number(reading.month)) ? String(reading.month).padStart(2, '0') : '??';
  return `${year}-${month}`;
}
