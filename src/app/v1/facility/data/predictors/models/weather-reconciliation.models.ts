import { WeatherStation } from '@data/models/degreeDays';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  HourlyWeatherReading,
  WeatherMonth,
  WeatherMonthRange,
  enumerateWeatherMonths,
  isValidWeatherMonth,
  weatherMonthValue
} from '@platform/weather/hourly-weather-data.models';
import {
  WeatherPredictorDefinition,
  buildWeatherGenerationPreview,
  calculateWeatherReadings,
  weatherPredictorFromDefinition
} from './weather-generation.models';
import {
  comparePredictorReadings,
  formatWeatherMonth,
  validateWeatherMonthRange,
  weatherMonthKey
} from './weather-range.models';

export type WeatherSourceCheck = 'none' | 'last-six' | 'all';
export type WeatherReadingChangeKind =
  | 'added'
  | 'changed'
  | 'deleted'
  | 'unchanged'
  | 'preserved-override';
export type WeatherMaintenanceMode = 'maintenance' | 'settings' | 'restore';

export interface WeatherStationGroupDefinition extends WeatherPredictorDefinition {
  readonly predictorGuid?: string;
  readonly production: boolean;
}

export interface WeatherStationGroupDraft {
  readonly sourceGroupKey?: string;
  readonly station: WeatherStation;
  readonly range: WeatherMonthRange;
  readonly definitions: readonly WeatherStationGroupDefinition[];
}

export interface WeatherStationGroupPreview {
  readonly workspaceRevision: number;
  readonly sourceGroupKey?: string;
  readonly station: WeatherStation;
  readonly range: WeatherMonthRange;
  readonly addPredictors: readonly IdbPredictor[];
  readonly updatePredictors: readonly IdbPredictor[];
  readonly deletePredictors: readonly IdbPredictor[];
  readonly addReadings: readonly IdbPredictorData[];
  readonly updateReadings: readonly IdbPredictorData[];
  readonly deleteReadings: readonly IdbPredictorData[];
  readonly facilityAnalyses: readonly IdbAnalysisItem[];
  readonly warningMonths: readonly WeatherMonth[];
}

export interface WeatherMaintenanceRequest {
  readonly range: WeatherMonthRange;
  readonly sourceCheck: WeatherSourceCheck;
}

export interface WeatherMaintenancePreviewRow {
  readonly key: string;
  readonly month: WeatherMonth;
  readonly monthLabel: string;
  readonly kind: WeatherReadingChangeKind;
  readonly existing?: IdbPredictorData;
  readonly proposed?: IdbPredictorData;
  readonly difference?: number;
  readonly warningChanged: boolean;
  readonly manualOverride: boolean;
}

export interface WeatherMaintenancePreview {
  readonly mode: WeatherMaintenanceMode;
  readonly workspaceRevision: number;
  readonly predictorGuid: string;
  readonly currentPredictor: IdbPredictor;
  readonly proposedPredictor: IdbPredictor;
  readonly range: WeatherMonthRange;
  readonly sourceCheck: WeatherSourceCheck;
  readonly rows: readonly WeatherMaintenancePreviewRow[];
  readonly add: readonly IdbPredictorData[];
  readonly update: readonly IdbPredictorData[];
  readonly delete: readonly IdbPredictorData[];
  readonly warningCount: number;
}

export function buildWeatherStationGroupPreview(
  draft: WeatherStationGroupDraft,
  currentPredictors: readonly IdbPredictor[],
  currentReadings: readonly IdbPredictorData[],
  hourlyData: readonly HourlyWeatherReading[],
  accountGuid: string,
  facilityGuid: string,
  workspaceRevision: number
): WeatherStationGroupPreview {
  const rangeError = validateWeatherMonthRange(draft.range);
  if (rangeError) throw new Error(rangeError);
  const existingByGuid = new Map(currentPredictors.map(predictor => [predictor.guid, predictor]));
  const seenGuids = new Set<string>();
  for (const definition of draft.definitions) {
    if (!definition.predictorGuid) continue;
    if (seenGuids.has(definition.predictorGuid) || !existingByGuid.has(definition.predictorGuid)) {
      throw new Error('The weather predictor selection is no longer current. Reload the workbench and try again.');
    }
    seenGuids.add(definition.predictorGuid);
  }

  const deletePredictors = currentPredictors.filter(predictor => !seenGuids.has(predictor.guid));
  const deletedPredictorIds = new Set(deletePredictors.map(predictor => predictor.guid));
  const deleteReadings = currentReadings.filter(reading => deletedPredictorIds.has(reading.predictorId));
  const addPredictors: IdbPredictor[] = [];
  const updatePredictors: IdbPredictor[] = [];
  const addReadings: IdbPredictorData[] = [];
  const updateReadings: IdbPredictorData[] = [];
  const reconciledDeleteReadings: IdbPredictorData[] = [];
  const warningKeys = new Set<string>();

  for (const definition of draft.definitions) {
    const current = definition.predictorGuid
      ? existingByGuid.get(definition.predictorGuid)
      : undefined;
    if (!current) {
      const generation = buildWeatherGenerationPreview(
        {
          production: definition.production,
          station: draft.station,
          range: draft.range,
          definitions: [definition]
        },
        hourlyData,
        accountGuid,
        facilityGuid,
        workspaceRevision
      );
      addPredictors.push(...generation.predictors);
      addReadings.push(...generation.readings);
      generation.warningMonths.forEach(month =>
        warningKeys.add(weatherMonthKey(month.year, month.month)));
      continue;
    }

    const proposed = weatherPredictorFromDefinition(current, definition, draft.station);
    const readings = currentReadings.filter(reading => reading.predictorId === current.guid);
    const maintenance = buildWeatherMaintenancePreview(
      current,
      readings,
      { range: draft.range, sourceCheck: 'all' },
      hourlyData,
      workspaceRevision,
      'settings',
      proposed
    );
    updatePredictors.push(proposed);
    addReadings.push(...maintenance.add);
    updateReadings.push(...maintenance.update);
    reconciledDeleteReadings.push(...maintenance.delete);
    maintenance.rows
      .filter(row => row.proposed?.weatherDataWarning)
      .forEach(row => warningKeys.add(weatherMonthKey(row.month.year, row.month.month)));
  }

  return {
    workspaceRevision,
    sourceGroupKey: draft.sourceGroupKey,
    station: draft.station,
    range: draft.range,
    addPredictors,
    updatePredictors,
    deletePredictors,
    addReadings,
    updateReadings,
    deleteReadings: [...deleteReadings, ...reconciledDeleteReadings],
    facilityAnalyses: [],
    warningMonths: enumerateWeatherMonths(draft.range)
      .filter(month => warningKeys.has(weatherMonthKey(month.year, month.month)))
  };
}

export function buildWeatherMaintenancePreview(
  predictor: IdbPredictor,
  readings: readonly IdbPredictorData[],
  request: WeatherMaintenanceRequest,
  hourlyData: readonly HourlyWeatherReading[],
  workspaceRevision: number,
  mode: WeatherMaintenanceMode = 'maintenance',
  proposedPredictor: IdbPredictor = predictor
): WeatherMaintenancePreview {
  const rangeError = validateWeatherMonthRange(request.range);
  if (rangeError) throw new Error(rangeError);
  assertReconciliableReadings(readings);
  const ordered = [...readings].sort(comparePredictorReadings);
  const existingByKey = new Map(ordered.map(reading => [
    weatherMonthKey(reading.year, reading.month),
    reading
  ]));
  const generated = calculateWeatherReadings(proposedPredictor, request.range, hourlyData);
  const generatedByKey = new Map(generated.map(reading => [
    weatherMonthKey(reading.year, reading.month),
    reading
  ]));
  const refreshKeys = weatherRefreshKeys(ordered, request, mode);
  const rows: WeatherMaintenancePreviewRow[] = [];

  for (const month of enumerateWeatherMonths(request.range)) {
    const key = weatherMonthKey(month.year, month.month);
    const existing = existingByKey.get(key);
    const calculated = generatedByKey.get(key)!;
    if (!existing) {
      rows.push(toPreviewRow(month, 'added', undefined, calculated));
      continue;
    }
    if (existing.weatherOverride && mode !== 'restore') {
      rows.push(toPreviewRow(month, 'preserved-override', existing, existing));
      continue;
    }
    if (!refreshKeys.has(key) && mode !== 'settings' && mode !== 'restore') {
      rows.push(toPreviewRow(month, 'unchanged', existing, existing));
      continue;
    }
    const proposed = {
      ...structuredClone(existing),
      amount: calculated.amount,
      weatherDataWarning: calculated.weatherDataWarning,
      weatherOverride: false,
      weatherDataChanged: false
    };
    const changed = existing.amount !== proposed.amount
      || !!existing.weatherDataWarning !== !!proposed.weatherDataWarning
      || !!existing.weatherOverride !== !!proposed.weatherOverride
      || !!existing.weatherDataChanged;
    rows.push(toPreviewRow(month, changed ? 'changed' : 'unchanged', existing, proposed));
  }

  const rangeStart = weatherMonthValue(request.range.start);
  const rangeEnd = weatherMonthValue(request.range.end);
  for (const existing of ordered) {
    const value = weatherMonthValue(existing);
    if (value < rangeStart || value > rangeEnd) {
      rows.push(toPreviewRow(
        { year: existing.year, month: existing.month },
        'deleted',
        existing,
        undefined
      ));
    }
  }
  rows.sort((first, second) => weatherMonthValue(first.month) - weatherMonthValue(second.month));
  const add = rows
    .filter(row => row.kind === 'added')
    .flatMap(row => row.proposed ? [row.proposed] : []);
  const update = rows
    .filter(row => row.kind === 'changed' && !!row.existing)
    .flatMap(row => row.proposed ? [row.proposed] : []);
  const deleted = rows
    .filter(row => row.kind === 'deleted')
    .flatMap(row => row.existing ? [row.existing] : []);
  return {
    mode,
    workspaceRevision,
    predictorGuid: predictor.guid,
    currentPredictor: structuredClone(predictor),
    proposedPredictor: structuredClone(proposedPredictor),
    range: request.range,
    sourceCheck: request.sourceCheck,
    rows,
    add,
    update,
    delete: deleted,
    warningCount: rows.filter(row => row.proposed?.weatherDataWarning).length
  };
}

function weatherRefreshKeys(
  readings: readonly IdbPredictorData[],
  request: WeatherMaintenanceRequest,
  mode: WeatherMaintenanceMode
): ReadonlySet<string> {
  if (mode === 'settings' || mode === 'restore' || request.sourceCheck === 'all') {
    return new Set(readings
      .filter(reading => !reading.weatherOverride)
      .map(reading => weatherMonthKey(reading.year, reading.month)));
  }
  if (request.sourceCheck === 'last-six') {
    return new Set(readings
      .filter(reading => !reading.weatherOverride)
      .slice(-6)
      .map(reading => weatherMonthKey(reading.year, reading.month)));
  }
  return new Set<string>();
}

function toPreviewRow(
  month: WeatherMonth,
  kind: WeatherReadingChangeKind,
  existing?: IdbPredictorData,
  proposed?: IdbPredictorData
): WeatherMaintenancePreviewRow {
  return {
    key: weatherMonthKey(month.year, month.month),
    month,
    monthLabel: formatWeatherMonth(month),
    kind,
    existing,
    proposed,
    difference: existing && proposed ? proposed.amount - existing.amount : undefined,
    warningChanged: !!existing && !!proposed
      && !!existing.weatherDataWarning !== !!proposed.weatherDataWarning,
    manualOverride: !!existing?.weatherOverride
  };
}

function assertReconciliableReadings(readings: readonly IdbPredictorData[]): void {
  const keys = new Set<string>();
  for (const reading of readings) {
    if (!isValidWeatherMonth(reading)) {
      throw new Error('Resolve invalid reading dates before managing calculated weather data.');
    }
    const key = weatherMonthKey(reading.year, reading.month);
    if (keys.has(key)) {
      throw new Error('Resolve duplicate reading months before managing calculated weather data.');
    }
    keys.add(key);
  }
}
