import { WeatherStation } from '@data/models/degreeDays';
import { getNewIdbPredictor, IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '@data/models/idbModels/predictorData';
import { getDetailedDataForMonth, hasWeatherDataWarning } from '@domain/calculations/weather/weather-data-calculations';
import {
  HourlyWeatherReading,
  WeatherMonth,
  WeatherMonthRange,
  enumerateWeatherMonths,
  weatherMonthValue
} from '@platform/weather/hourly-weather-data.models';
import { getDegreeDayAmount } from '@shared/sharedHelperFunctions';
import { weatherPredictorUnit } from './predictor-settings.models';
import {
  currentWeatherMonthValue,
  formatWeatherMonth,
  validateWeatherMonthRange,
  weatherMonthKey
} from './weather-range.models';

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

export interface WeatherStationMonthCalculationValue {
  readonly predictorGuid: string;
  readonly amount: number;
  readonly weatherDataWarning: boolean;
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
    if (seenTypes.has(definition.weatherDataType)) {
      throw new Error('Each weather data type can only be selected once.');
    }
    seenTypes.add(definition.weatherDataType);
    return createWeatherPredictor(definition, draft, accountGuid, facilityGuid);
  });
  const readings = predictors.flatMap(predictor =>
    calculateWeatherReadings(predictor, draft.range, hourlyData));
  const warningKeys = new Set(readings
    .filter(reading => reading.weatherDataWarning)
    .map(reading => weatherMonthKey(reading.year, reading.month)));
  return {
    workspaceRevision,
    range: draft.range,
    predictors,
    readings,
    warningMonths: enumerateWeatherMonths(draft.range)
      .filter(month => warningKeys.has(weatherMonthKey(month.year, month.month)))
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
  if (definitions.length === 0) {
    throw new Error('Add at least one weather predictor before selecting a station.');
  }
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
  const warningKeys = new Set(series
    .flatMap(item => item.points)
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

export function buildWeatherStationMonthCalculation(
  predictors: readonly IdbPredictor[],
  month: WeatherMonth,
  hourlyData: readonly HourlyWeatherReading[]
): readonly WeatherStationMonthCalculationValue[] {
  const range = { start: month, end: month };
  const rangeError = validateWeatherMonthRange(range);
  if (rangeError) throw new Error(rangeError);
  if (predictors.length === 0) throw new Error('This weather station has no predictors to calculate.');
  const stationId = predictors[0].weatherStationId?.trim();
  if (!stationId || predictors.some(predictor => predictor.weatherStationId?.trim() !== stationId)) {
    throw new Error('The weather predictors must belong to the same available station.');
  }
  return predictors.map(predictor => {
    const reading = calculateWeatherReadings(predictor, range, hourlyData)[0];
    if (!reading || !Number.isFinite(reading.amount)) {
      throw new Error(`A calculated value is not available for ${predictor.name}.`);
    }
    return {
      predictorGuid: predictor.guid,
      amount: reading.amount,
      weatherDataWarning: !!reading.weatherDataWarning
    };
  });
}

/** Internal reconciliation helper; not part of the public models barrel. */
export function weatherPredictorFromDefinition(
  current: IdbPredictor,
  definition: WeatherPredictorDefinition & { readonly production: boolean },
  station: WeatherStation
): IdbPredictor {
  validateWeatherDefinition(definition);
  const proposed = structuredClone(current);
  proposed.name = definition.name.trim();
  proposed.production = definition.production;
  proposed.productionInAnalysis = definition.production;
  proposed.unit = weatherPredictorUnit(definition.weatherDataType);
  proposed.weatherDataType = definition.weatherDataType;
  proposed.weatherStationId = station.ID;
  proposed.weatherStationName = station.name;
  proposed.heatingBaseTemperature = definition.weatherDataType === 'HDD'
    ? definition.baseTemperature : undefined;
  proposed.coolingBaseTemperature = definition.weatherDataType === 'CDD'
    ? definition.baseTemperature : undefined;
  return proposed;
}

/** Internal reconciliation helper; not part of the public models barrel. */
export function calculateWeatherReadings(
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

function createWeatherPredictor(
  definition: WeatherPredictorDefinition,
  draft: WeatherPredictorGenerationDraft,
  accountGuid: string,
  facilityGuid: string
): IdbPredictor {
  validateWeatherDefinition(definition, 'generated');
  const predictor = getNewIdbPredictor(accountGuid, facilityGuid);
  predictor.name = definition.name.trim();
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

function calculateWeatherDefinitionMonths(
  definition: WeatherPredictorDefinition,
  station: Pick<WeatherStation, 'ID' | 'name'>,
  range: WeatherMonthRange,
  hourlyData: readonly HourlyWeatherReading[]
): WeatherStationSelectionPreviewPoint[] {
  const heatingBase = definition.weatherDataType === 'HDD' ? definition.baseTemperature : undefined;
  const coolingBase = definition.weatherDataType === 'CDD' ? definition.baseTemperature : undefined;
  return enumerateWeatherMonths(range).map(month => {
    if (weatherMonthValue(month) > currentWeatherMonthValue()) {
      return { month, monthLabel: formatWeatherMonth(month), amount: 0, warning: false };
    }
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

function validateWeatherDefinition(
  definition: WeatherPredictorDefinition,
  qualifier = 'weather'
): void {
  const name = definition.name.trim();
  if (!name || name.length > 100) {
    throw new Error(`Each ${qualifier} predictor needs a name of 100 characters or fewer.`);
  }
  if ((definition.weatherDataType === 'HDD' || definition.weatherDataType === 'CDD')
    && !Number.isFinite(definition.baseTemperature)) {
    throw new Error('Enter the applicable base temperature for each degree-day predictor.');
  }
}
