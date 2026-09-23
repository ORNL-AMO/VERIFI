import { IdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '@data/models/idbModels/predictorData';

export type PredictorReadingEditorMode = 'add' | 'edit';
export type PredictorReadingSortColumn = 'month' | 'value';
export type PredictorReadingSortDirection = 'asc' | 'desc';
export type PredictorReadingFilter = 'all' | 'attention';

export interface PredictorReadingFormValue {
  readonly month: string;
  readonly amount: number | null;
  readonly notes: string;
  readonly manualOverride: boolean;
}

export interface PredictorReadingAttentionFlags {
  readonly invalidDate: boolean;
  readonly invalidValue: boolean;
  readonly duplicateMonth: boolean;
  readonly negativeValue: boolean;
  readonly weatherWarning: boolean;
  readonly hasAttention: boolean;
}

export interface PredictorReadingTableRow {
  readonly reading: IdbPredictorData;
  readonly monthLabel: string;
  readonly amountLabel: string;
  readonly monthSortValue: number;
  readonly valueSortValue: number;
  readonly attention: PredictorReadingAttentionFlags;
}

export interface PredictorReadingTableView {
  readonly rows: readonly PredictorReadingTableRow[];
  readonly unit?: string;
  readonly hasAttention: boolean;
}

export interface PredictorMissingMonth {
  readonly year: number;
  readonly month: number;
  readonly key: string;
  readonly label: string;
}

export type PredictorReadingsConfirmation =
  | { readonly kind: 'delete-one'; readonly reading: IdbPredictorData }
  | { readonly kind: 'delete-many'; readonly readings: readonly IdbPredictorData[] }
  | { readonly kind: 'fill-missing'; readonly months: readonly PredictorMissingMonth[] };

export interface PredictorReadingSaveRequest {
  readonly reading: IdbPredictorData;
  readonly addAnother: boolean;
}

export function buildPredictorReadingTableView(
  predictor: IdbPredictor | undefined,
  readings: readonly IdbPredictorData[]
): PredictorReadingTableView {
  if (!predictor) return { rows: [], hasAttention: false };
  const relevantReadings = readings.filter(reading => reading.predictorId === predictor.guid);
  const monthCounts = relevantReadings.reduce<Map<string, number>>((counts, reading) => {
    const key = validPredictorReadingDate(reading) ? predictorMonthKey(reading.year, reading.month) : undefined;
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const rows = relevantReadings.map(reading => {
    const validDate = validPredictorReadingDate(reading);
    const validValue = Number.isFinite(reading.amount);
    const duplicateMonth = validDate && (monthCounts.get(predictorMonthKey(reading.year, reading.month)) ?? 0) > 1;
    const attention = {
      invalidDate: !validDate,
      invalidValue: !validValue,
      duplicateMonth,
      negativeValue: validValue && reading.amount < 0 && !predictor.canBeNegative,
      weatherWarning: predictor.predictorType === 'Weather'
        && !!reading.weatherDataWarning
        && !predictor.ignoreWeatherDataWarning
    };
    return {
      reading,
      monthLabel: formatPredictorMonth(reading.year, reading.month),
      amountLabel: formatPredictorReadingAmount(reading.amount),
      monthSortValue: validDate ? reading.year * 12 + reading.month - 1 : Number.NEGATIVE_INFINITY,
      valueSortValue: validValue ? reading.amount : Number.NEGATIVE_INFINITY,
      attention: {
        ...attention,
        hasAttention: attention.invalidDate || attention.invalidValue || attention.duplicateMonth
          || attention.negativeValue || attention.weatherWarning
      }
    };
  });
  return { rows, unit: predictor.unit, hasAttention: rows.some(row => row.attention.hasAttention) };
}

export function findMissingPredictorMonths(readings: readonly IdbPredictorData[]): PredictorMissingMonth[] {
  const monthValues = [...new Set(readings
    .filter(validPredictorReadingDate)
    .map(reading => reading.year * 12 + reading.month - 1))]
    .sort((first, second) => first - second);
  if (monthValues.length < 2) return [];
  const existing = new Set(monthValues);
  const missing: PredictorMissingMonth[] = [];
  for (let value = monthValues[0] + 1; value < monthValues[monthValues.length - 1]; value++) {
    if (existing.has(value)) continue;
    const year = Math.floor(value / 12);
    const month = value % 12 + 1;
    missing.push({ year, month, key: predictorMonthKey(year, month), label: formatPredictorMonth(year, month) });
  }
  return missing;
}

export function createPredictorReading(
  predictor: IdbPredictor,
  existingReadings: readonly IdbPredictorData[],
  requestedMonth?: Pick<PredictorMissingMonth, 'year' | 'month'>
): IdbPredictorData {
  const reading = getNewIdbPredictorData(predictor, [...existingReadings]);
  delete reading.id;
  if (requestedMonth) {
    reading.year = requestedMonth.year;
    reading.month = requestedMonth.month;
  }
  if (predictor.predictorType === 'Weather') {
    reading.weatherOverride = true;
    reading.weatherDataWarning = false;
    reading.weatherDataChanged = false;
  }
  return reading;
}

export function validPredictorReadingDate(reading: Pick<IdbPredictorData, 'year' | 'month'>): boolean {
  return Number.isInteger(reading.year) && reading.year > 0
    && Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12;
}

export function predictorMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatPredictorMonth(year: number, month: number): string {
  if (!validPredictorReadingDate({ year, month })) return 'Invalid month';
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function formatPredictorReadingAmount(value: number | undefined): string {
  if (!Number.isFinite(value)) return 'Unavailable';
  const numericValue = value as number;
  return numericValue.toLocaleString(undefined, {
    maximumSignificantDigits: Math.abs(numericValue) < 10000 ? 5 : undefined,
    maximumFractionDigits: Math.abs(numericValue) >= 10000 ? 0 : undefined
  });
}
