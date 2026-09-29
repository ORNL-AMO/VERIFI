import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  WeatherMonth,
  WeatherMonthRange,
  enumerateWeatherMonths,
  isValidWeatherMonth,
  weatherMonthValue
} from '@platform/weather/hourly-weather-data.models';

export function validateWeatherMonthRange(range: WeatherMonthRange): string | undefined {
  if (!isValidWeatherMonth(range.start) || !isValidWeatherMonth(range.end)) {
    return 'Enter a valid start and end month.';
  }
  if (weatherMonthValue(range.end) < weatherMonthValue(range.start)) {
    return 'The end month must be on or after the start month.';
  }
  return undefined;
}

export function weatherLastTwoYearsRange(now = new Date()): WeatherMonthRange {
  const endDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = { year: endDate.getFullYear(), month: endDate.getMonth() + 1 };
  const startDate = new Date(end.year, end.month - 1 - 23, 1);
  return {
    start: { year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
    end
  };
}

export function weatherFutureMonthCount(range: WeatherMonthRange, now = new Date()): number {
  const current = currentWeatherMonthValue(now);
  return enumerateWeatherMonths(range).filter(month => weatherMonthValue(month) > current).length;
}

export function weatherSourceRangeThroughPresent(
  range: WeatherMonthRange,
  now = new Date()
): WeatherMonthRange | undefined {
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 };
  if (weatherMonthValue(range.start) > weatherMonthValue(current)) return undefined;
  return {
    start: range.start,
    end: weatherMonthValue(range.end) > weatherMonthValue(current) ? current : range.end
  };
}

export function weatherRangeForReadings(
  readings: readonly IdbPredictorData[]
): WeatherMonthRange | undefined {
  const valid = readings
    .filter(reading => isValidWeatherMonth(reading))
    .sort(comparePredictorReadings);
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
  return new Date(month.year, month.month - 1, 1)
    .toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** Internal helper shared by weather generation and range projections. */
export function currentWeatherMonthValue(now = new Date()): number {
  return weatherMonthValue({ year: now.getFullYear(), month: now.getMonth() + 1 });
}

/** Internal stable ordering for persisted predictor readings. */
export function comparePredictorReadings(
  first: IdbPredictorData,
  second: IdbPredictorData
): number {
  return weatherMonthValue(first) - weatherMonthValue(second)
    || first.guid.localeCompare(second.guid);
}
