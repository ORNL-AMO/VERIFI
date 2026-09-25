import { IdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '@data/models/idbModels/predictorData';
import { formatPredictorMonth, formatPredictorReadingAmount, predictorMonthKey, validPredictorReadingDate } from './predictor-reading.models';
import { weatherDataTypeLabel } from './predictor-card.models';
import { weatherPredictorUnit } from './predictor-settings.models';

export interface WeatherStationReadingColumn {
  readonly predictor: IdbPredictor;
  readonly typeLabel: string;
  readonly unit: string;
}

export interface WeatherStationReadingCell {
  readonly predictorGuid: string;
  readonly readings: readonly IdbPredictorData[];
  readonly reading?: IdbPredictorData;
  readonly amountLabel: string;
  readonly missing: boolean;
  readonly duplicate: boolean;
  readonly invalidValue: boolean;
  readonly weatherWarning: boolean;
  readonly weatherDataChanged: boolean;
  readonly manualOverride: boolean;
  readonly hasAttention: boolean;
}

export interface WeatherStationReadingRow {
  readonly key: string;
  readonly year: number;
  readonly month: number;
  readonly monthLabel: string;
  readonly monthSortValue: number;
  readonly cells: readonly WeatherStationReadingCell[];
  readonly readings: readonly IdbPredictorData[];
  readonly hasAttention: boolean;
}

export interface WeatherStationReadingMatrix {
  readonly columns: readonly WeatherStationReadingColumn[];
  readonly rows: readonly WeatherStationReadingRow[];
  readonly hasAttention: boolean;
}

export interface WeatherStationMonthValue {
  readonly predictorGuid: string;
  readonly amount: number;
  readonly calculated?: boolean;
  readonly weatherDataWarning?: boolean;
}

export interface WeatherStationMonthDraft {
  readonly year: number;
  readonly month: number;
  readonly values: readonly WeatherStationMonthValue[];
}

export interface WeatherStationMonthChangeSet {
  readonly workspaceRevision: number;
  readonly groupKey: string;
  readonly predictorGuids: readonly string[];
  readonly year: number;
  readonly month: number;
  readonly add: readonly IdbPredictorData[];
  readonly update: readonly IdbPredictorData[];
  readonly delete: readonly IdbPredictorData[];
}

export function buildWeatherStationReadingMatrix(
  predictors: readonly IdbPredictor[],
  readings: readonly IdbPredictorData[]
): WeatherStationReadingMatrix {
  const orderedPredictors = [...predictors].sort((first, second) =>
    (first.name || '').localeCompare(second.name || '') || first.guid.localeCompare(second.guid));
  const predictorIds = new Set(orderedPredictors.map(predictor => predictor.guid));
  const validReadings = readings.filter(reading => predictorIds.has(reading.predictorId) && validPredictorReadingDate(reading));
  const monthValues = [...new Set(validReadings.map(reading => reading.year * 12 + reading.month - 1))]
    .sort((first, second) => second - first);
  const columns = orderedPredictors.map(predictor => ({
    predictor,
    typeLabel: weatherDataTypeLabel(predictor.weatherDataType),
    unit: weatherPredictorUnit(predictor.weatherDataType)
  }));
  const rows = monthValues.map(value => {
    const year = Math.floor(value / 12);
    const month = value % 12 + 1;
    const cells = orderedPredictors.map(predictor => buildCell(
      predictor.guid,
      validReadings.filter(reading => reading.predictorId === predictor.guid
        && reading.year === year && reading.month === month)
    ));
    return {
      key: predictorMonthKey(year, month),
      year,
      month,
      monthLabel: formatPredictorMonth(year, month),
      monthSortValue: value,
      cells,
      readings: cells.flatMap(cell => cell.readings),
      hasAttention: cells.some(cell => cell.hasAttention)
    };
  });
  return { columns, rows, hasAttention: rows.some(row => row.hasAttention) };
}

export function buildWeatherStationMonthChangeSet(
  mode: 'add' | 'edit',
  groupKey: string,
  predictors: readonly IdbPredictor[],
  readings: readonly IdbPredictorData[],
  draft: WeatherStationMonthDraft,
  workspaceRevision: number
): WeatherStationMonthChangeSet {
  validateMonth(draft.year, draft.month);
  const values = new Map<string, WeatherStationMonthValue>();
  for (const entry of draft.values) {
    if (values.has(entry.predictorGuid) || !Number.isFinite(entry.amount)) {
      throw new Error('Enter one finite value for every weather predictor.');
    }
    values.set(entry.predictorGuid, entry);
  }
  if (predictors.length === 0 || predictors.some(predictor => !values.has(predictor.guid))
    || values.size !== predictors.length) {
    throw new Error('Enter one finite value for every weather predictor.');
  }

  const predictorIds = new Set(predictors.map(predictor => predictor.guid));
  const monthReadings = readings.filter(reading => predictorIds.has(reading.predictorId)
    && reading.year === draft.year && reading.month === draft.month);
  if (mode === 'add' && monthReadings.length > 0) {
    throw new Error('This month already exists. Edit the existing month instead.');
  }

  const add: IdbPredictorData[] = [];
  const update: IdbPredictorData[] = [];
  for (const predictor of predictors) {
    const existing = monthReadings.filter(reading => reading.predictorId === predictor.guid);
    if (existing.length > 1) {
      throw new Error(`Resolve duplicate readings for ${predictor.name} before editing this month.`);
    }
    const value = values.get(predictor.guid)!;
    const amount = value.amount;
    if (existing.length === 0) {
      const reading = getNewIdbPredictorData(predictor);
      delete reading.id;
      reading.year = draft.year;
      reading.month = draft.month;
      reading.amount = amount;
      reading.notes = '';
      reading.weatherOverride = !value.calculated;
      reading.weatherDataWarning = value.calculated && !!value.weatherDataWarning;
      reading.weatherDataChanged = false;
      add.push(reading);
      continue;
    }
    if (existing[0].amount === amount) continue;
    update.push({
      ...structuredClone(existing[0]),
      amount,
      weatherOverride: true,
      weatherDataWarning: false,
      weatherDataChanged: false
    });
  }

  return {
    workspaceRevision,
    groupKey,
    predictorGuids: predictors.map(predictor => predictor.guid),
    year: draft.year,
    month: draft.month,
    add,
    update,
    delete: []
  };
}

export function buildWeatherStationMonthDeleteChangeSet(
  groupKey: string,
  predictors: readonly IdbPredictor[],
  readings: readonly IdbPredictorData[],
  year: number,
  month: number,
  workspaceRevision: number
): WeatherStationMonthChangeSet {
  validateMonth(year, month);
  const predictorIds = new Set(predictors.map(predictor => predictor.guid));
  return {
    workspaceRevision,
    groupKey,
    predictorGuids: predictors.map(predictor => predictor.guid),
    year,
    month,
    add: [],
    update: [],
    delete: readings.filter(reading => predictorIds.has(reading.predictorId)
      && reading.year === year && reading.month === month)
  };
}

function buildCell(predictorGuid: string, readings: readonly IdbPredictorData[]): WeatherStationReadingCell {
  const ordered = [...readings].sort((first, second) => (first.id ?? Number.MAX_SAFE_INTEGER) - (second.id ?? Number.MAX_SAFE_INTEGER)
    || first.guid.localeCompare(second.guid));
  const reading = ordered[0];
  const missing = ordered.length === 0;
  const duplicate = ordered.length > 1;
  const invalidValue = !!reading && !Number.isFinite(reading.amount);
  const weatherWarning = ordered.some(item => !!item.weatherDataWarning);
  const weatherDataChanged = ordered.some(item => !!item.weatherDataChanged);
  const manualOverride = ordered.some(item => !!item.weatherOverride);
  return {
    predictorGuid,
    readings: ordered,
    reading,
    amountLabel: reading ? formatPredictorReadingAmount(reading.amount) : '—',
    missing,
    duplicate,
    invalidValue,
    weatherWarning,
    weatherDataChanged,
    manualOverride,
    hasAttention: missing || duplicate || invalidValue || weatherWarning || weatherDataChanged
  };
}

function validateMonth(year: number, month: number): void {
  if (!validPredictorReadingDate({ year, month })) throw new Error('Enter a valid month.');
}
