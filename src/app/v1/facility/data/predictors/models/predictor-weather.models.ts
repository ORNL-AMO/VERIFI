import { getDetailedDataForMonth, hasWeatherDataWarning } from '@domain/calculations/weather/weather-data-calculations';
import { WeatherStation } from '@data/models/degreeDays';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbPredictor, IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  HourlyWeatherReading,
  WeatherMonth,
  WeatherMonthRange,
  enumerateWeatherMonths,
  isValidWeatherMonth,
  weatherMonthValue
} from '@platform/weather/hourly-weather-data.models';
import { getDegreeDayAmount } from '@shared/sharedHelperFunctions';
import { weatherPredictorUnit } from './predictor-settings.models';

export type PredictorWeatherWorkflowStatus =
  | 'idle'
  | 'loading'
  | 'calculating'
  | 'preview-ready'
  | 'committing'
  | 'cancelled'
  | 'error';

export type WeatherSourceCheck = 'none' | 'last-six' | 'all';
export type WeatherReadingChangeKind = 'added' | 'changed' | 'deleted' | 'unchanged' | 'preserved-override';
export type WeatherMaintenanceMode = 'maintenance' | 'settings' | 'restore';

export interface PredictorWeatherWorkflowState {
  readonly status: PredictorWeatherWorkflowStatus;
  readonly message: string;
  readonly error?: string;
}

export interface WeatherPredictorDefinition {
  readonly weatherDataType: WeatherDataType;
  readonly name: string;
  readonly baseTemperature?: number;
  readonly unit?: string;
}

export interface WeatherPredictorGenerationDraft {
  readonly production: boolean;
  readonly station: WeatherStation;
  readonly range: WeatherMonthRange;
  readonly definitions: readonly WeatherPredictorDefinition[];
}

export interface WeatherPredictorGenerationPreview {
  readonly workspaceRevision: number;
  readonly range: WeatherMonthRange;
  readonly predictors: readonly IdbPredictor[];
  readonly readings: readonly IdbPredictorData[];
  readonly warningMonths: readonly WeatherMonth[];
}

export interface WeatherStationSelectionPreviewPoint {
  readonly month: WeatherMonth;
  readonly monthLabel: string;
  readonly amount: number;
  readonly warning: boolean;
}

export interface WeatherStationSelectionPreviewSeries {
  readonly key: string;
  readonly name: string;
  readonly weatherDataType: WeatherDataType;
  readonly unit: string;
  readonly points: readonly WeatherStationSelectionPreviewPoint[];
}

export interface WeatherStationSelectionPreview {
  readonly station: WeatherStation;
  readonly range: WeatherMonthRange;
  readonly series: readonly WeatherStationSelectionPreviewSeries[];
  readonly warningMonths: readonly WeatherMonth[];
}

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

export function defaultWeatherPredictorName(type: WeatherDataType, baseTemperature?: number): string {
  if (type === 'HDD') return `HDD Generated${Number.isFinite(baseTemperature) ? ` (${baseTemperature}F)` : ''}`;
  if (type === 'CDD') return `CDD Generated${Number.isFinite(baseTemperature) ? ` (${baseTemperature}F)` : ''}`;
  const names: Record<Exclude<WeatherDataType, 'HDD' | 'CDD'>, string> = {
    relativeHumidity: 'Relative Humidity',
    dryBulbTemp: 'Dry Bulb Temp',
    wetBulbTemp: 'Wet Bulb Temp',
    dewPointTemp: 'Dew Point Temp',
    precipitation: 'Precipitation'
  };
  return names[type];
}

export function validateWeatherMonthRange(range: WeatherMonthRange): string | undefined {
  if (!isValidWeatherMonth(range.start) || !isValidWeatherMonth(range.end)) return 'Enter a valid start and end month.';
  if (weatherMonthValue(range.end) < weatherMonthValue(range.start)) return 'The end month must be on or after the start month.';
  const now = new Date();
  const current = weatherMonthValue({ year: now.getFullYear(), month: now.getMonth() + 1 });
  if (weatherMonthValue(range.end) > current) return 'Weather data cannot be generated for future months.';
  return undefined;
}

export function buildWeatherGenerationPreview(
  draft: WeatherPredictorGenerationDraft,
  hourlyData: readonly HourlyWeatherReading[],
  accountGuid: string,
  facilityGuid: string,
  workspaceRevision: number
): WeatherPredictorGenerationPreview {
  const rangeError = validateWeatherMonthRange(draft.range);
  if (rangeError) throw new Error(rangeError);
  if (draft.definitions.length === 0) throw new Error('Select at least one weather data type.');
  const seenTypes = new Set<WeatherDataType>();
  const predictors = draft.definitions.map(definition => {
    if (seenTypes.has(definition.weatherDataType)) throw new Error('Each weather data type can only be selected once.');
    seenTypes.add(definition.weatherDataType);
    return createWeatherPredictor(definition, draft, accountGuid, facilityGuid);
  });
  const readings = predictors.flatMap(predictor => calculateWeatherReadings(predictor, draft.range, hourlyData));
  const warningKeys = new Set(readings.filter(reading => reading.weatherDataWarning)
    .map(reading => weatherMonthKey(reading.year, reading.month)));
  return {
    workspaceRevision,
    range: draft.range,
    predictors,
    readings,
    warningMonths: enumerateWeatherMonths(draft.range).filter(month => warningKeys.has(weatherMonthKey(month.year, month.month)))
  };
}

export function buildWeatherStationSelectionPreview(
  station: WeatherStation,
  range: WeatherMonthRange,
  definitions: readonly WeatherPredictorDefinition[],
  hourlyData: readonly HourlyWeatherReading[]
): WeatherStationSelectionPreview {
  const rangeError = validateWeatherMonthRange(range);
  if (rangeError) throw new Error(rangeError);
  if (definitions.length === 0) throw new Error('Add at least one weather predictor before selecting a station.');
  const series = definitions.map((definition, index) => {
    validateWeatherDefinition(definition);
    return {
      key: `${index}:${definition.weatherDataType}:${definition.name}`,
      name: definition.name.trim(),
      weatherDataType: definition.weatherDataType,
      unit: weatherPredictorUnit(definition.weatherDataType),
      points: calculateWeatherDefinitionMonths(definition, station, range, hourlyData)
    };
  });
  const warningKeys = new Set(series.flatMap(item => item.points)
    .filter(point => point.warning)
    .map(point => weatherMonthKey(point.month.year, point.month.month)));
  return {
    station,
    range,
    series,
    warningMonths: enumerateWeatherMonths(range)
      .filter(month => warningKeys.has(weatherMonthKey(month.year, month.month)))
  };
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
    const current = definition.predictorGuid ? existingByGuid.get(definition.predictorGuid) : undefined;
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
      generation.warningMonths.forEach(month => warningKeys.add(weatherMonthKey(month.year, month.month)));
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

  const allDeleteReadings = [...deleteReadings, ...reconciledDeleteReadings];
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
    deleteReadings: allDeleteReadings,
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
  const existingByKey = new Map(ordered.map(reading => [weatherMonthKey(reading.year, reading.month), reading]));
  const generated = calculateWeatherReadings(proposedPredictor, request.range, hourlyData);
  const generatedByKey = new Map(generated.map(reading => [weatherMonthKey(reading.year, reading.month), reading]));
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
  const add = rows.filter(row => row.kind === 'added').flatMap(row => row.proposed ? [row.proposed] : []);
  const update = rows.filter(row => row.kind === 'changed' && !!row.existing).flatMap(row => row.proposed ? [row.proposed] : []);
  const deleted = rows.filter(row => row.kind === 'deleted').flatMap(row => row.existing ? [row.existing] : []);
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

export function weatherRangeForReadings(readings: readonly IdbPredictorData[]): WeatherMonthRange | undefined {
  const valid = readings.filter(reading => isValidWeatherMonth(reading)).sort(comparePredictorReadings);
  if (valid.length === 0) return undefined;
  return {
    start: { year: valid[0].year, month: valid[0].month },
    end: { year: valid[valid.length - 1].year, month: valid[valid.length - 1].month }
  };
}

export function weatherMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatWeatherMonth(month: WeatherMonth): string {
  return new Date(month.year, month.month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function createWeatherPredictor(
  definition: WeatherPredictorDefinition,
  draft: WeatherPredictorGenerationDraft,
  accountGuid: string,
  facilityGuid: string
): IdbPredictor {
  const name = definition.name.trim();
  if (!name || name.length > 100) throw new Error('Each generated predictor needs a name of 100 characters or fewer.');
  if ((definition.weatherDataType === 'HDD' || definition.weatherDataType === 'CDD')
    && !Number.isFinite(definition.baseTemperature)) {
    throw new Error('Enter the applicable base temperature for each degree-day predictor.');
  }
  const predictor = getNewIdbPredictor(accountGuid, facilityGuid);
  predictor.name = name;
  predictor.production = draft.production;
  predictor.productionInAnalysis = draft.production;
  predictor.predictorType = 'Weather';
  predictor.weatherDataType = definition.weatherDataType;
  predictor.weatherStationId = draft.station.ID;
  predictor.weatherStationName = draft.station.name;
  predictor.unit = weatherPredictorUnit(definition.weatherDataType);
  predictor.canBeNegative = false;
  predictor.ignoreDateStatusChecks = false;
  predictor.noLongerInUse = false;
  if (definition.weatherDataType === 'HDD') predictor.heatingBaseTemperature = definition.baseTemperature;
  if (definition.weatherDataType === 'CDD') predictor.coolingBaseTemperature = definition.baseTemperature;
  return predictor;
}

function weatherPredictorFromDefinition(
  current: IdbPredictor,
  definition: WeatherStationGroupDefinition,
  station: WeatherStation
): IdbPredictor {
  const name = definition.name.trim();
  if (!name || name.length > 100) throw new Error('Each weather predictor needs a name of 100 characters or fewer.');
  if ((definition.weatherDataType === 'HDD' || definition.weatherDataType === 'CDD')
    && !Number.isFinite(definition.baseTemperature)) {
    throw new Error('Enter the applicable base temperature for each degree-day predictor.');
  }
  const proposed = structuredClone(current);
  proposed.name = name;
  proposed.production = definition.production;
  proposed.productionInAnalysis = definition.production;
  proposed.unit = weatherPredictorUnit(definition.weatherDataType);
  proposed.weatherDataType = definition.weatherDataType;
  proposed.weatherStationId = station.ID;
  proposed.weatherStationName = station.name;
  proposed.heatingBaseTemperature = definition.weatherDataType === 'HDD' ? definition.baseTemperature : undefined;
  proposed.coolingBaseTemperature = definition.weatherDataType === 'CDD' ? definition.baseTemperature : undefined;
  return proposed;
}

function calculateWeatherReadings(
  predictor: IdbPredictor,
  range: WeatherMonthRange,
  hourlyData: readonly HourlyWeatherReading[]
): IdbPredictorData[] {
  const definition: WeatherPredictorDefinition = {
    weatherDataType: predictor.weatherDataType,
    name: predictor.name,
    baseTemperature: predictor.weatherDataType === 'HDD'
      ? predictor.heatingBaseTemperature
      : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined
  };
  const station = { ID: predictor.weatherStationId, name: predictor.weatherStationName };
  return calculateWeatherDefinitionMonths(definition, station, range, hourlyData).map(value => {
    const reading = getNewIdbPredictorData(predictor);
    delete reading.id;
    reading.year = value.month.year;
    reading.month = value.month.month;
    reading.amount = value.amount;
    reading.weatherDataWarning = value.warning;
    reading.weatherOverride = false;
    reading.weatherDataChanged = false;
    return reading;
  });
}

function calculateWeatherDefinitionMonths(
  definition: WeatherPredictorDefinition,
  station: Pick<WeatherStation, 'ID' | 'name'>,
  range: WeatherMonthRange,
  hourlyData: readonly HourlyWeatherReading[]
): WeatherStationSelectionPreviewPoint[] {
  const heatingBase = definition.weatherDataType === 'HDD' ? definition.baseTemperature : undefined;
  const coolingBase = definition.weatherDataType === 'CDD' ? definition.baseTemperature : undefined;
  return enumerateWeatherMonths(range).map(month => {
    const details = getDetailedDataForMonth(
      hourlyData,
      month.month - 1,
      month.year,
      heatingBase,
      coolingBase,
      station.ID,
      station.name
    );
    return {
      month,
      monthLabel: formatWeatherMonth(month),
      amount: getDegreeDayAmount(details, definition.weatherDataType),
      warning: hasWeatherDataWarning(details, definition.weatherDataType)
    };
  });
}

function validateWeatherDefinition(definition: WeatherPredictorDefinition): void {
  const name = definition.name.trim();
  if (!name || name.length > 100) {
    throw new Error('Each weather predictor needs a name of 100 characters or fewer.');
  }
  if ((definition.weatherDataType === 'HDD' || definition.weatherDataType === 'CDD')
    && !Number.isFinite(definition.baseTemperature)) {
    throw new Error('Enter the applicable base temperature for each degree-day predictor.');
  }
}

function weatherRefreshKeys(
  readings: readonly IdbPredictorData[],
  request: WeatherMaintenanceRequest,
  mode: WeatherMaintenanceMode
): ReadonlySet<string> {
  if (mode === 'settings' || mode === 'restore' || request.sourceCheck === 'all') {
    return new Set(readings.filter(reading => !reading.weatherOverride)
      .map(reading => weatherMonthKey(reading.year, reading.month)));
  }
  if (request.sourceCheck === 'last-six') {
    return new Set(readings.filter(reading => !reading.weatherOverride)
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
    if (keys.has(key)) throw new Error('Resolve duplicate reading months before managing calculated weather data.');
    keys.add(key);
  }
}

function comparePredictorReadings(first: IdbPredictorData, second: IdbPredictorData): number {
  return weatherMonthValue(first) - weatherMonthValue(second) || first.guid.localeCompare(second.guid);
}
