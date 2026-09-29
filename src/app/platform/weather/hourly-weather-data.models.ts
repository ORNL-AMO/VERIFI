export type WeatherDataParameter =
  | 'dry_bulb_temp'
  | 'humidity'
  | 'dew_point_temp'
  | 'wet_bulb_temp'
  | 'pressure'
  | 'precipitation'
  | 'wind_speed';

export interface WeatherMonth {
  readonly year: number;
  /** One-based calendar month. */
  readonly month: number;
}

export interface WeatherMonthRange {
  readonly start: WeatherMonth;
  readonly end: WeatherMonth;
}

export interface HourlyWeatherDataRequest {
  readonly stationId: string;
  readonly range: WeatherMonthRange;
  /** Retained for legacy callers; the shared endpoint boundary requests every calculation field. */
  readonly parameters?: readonly WeatherDataParameter[];
}

export interface HourlyWeatherReading {
  readonly time: Date;
  readonly dry_bulb_temp?: number | null;
  readonly humidity?: number | null;
  readonly dew_point_temp?: number | null;
  readonly wet_bulb_temp?: number | null;
  readonly pressure?: number | null;
  readonly precipitation?: number | null;
  readonly wind_speed?: number | null;
}

export const ALL_WEATHER_DATA_PARAMETERS: readonly WeatherDataParameter[] = [
  'dry_bulb_temp',
  'humidity',
  'dew_point_temp',
  'wet_bulb_temp',
  'pressure',
  'precipitation',
  'wind_speed'
];

export function isValidWeatherMonth(month: WeatherMonth): boolean {
  return Number.isInteger(month.year) && month.year > 0
    && Number.isInteger(month.month) && month.month >= 1 && month.month <= 12;
}

export function weatherMonthValue(month: WeatherMonth): number {
  return month.year * 12 + month.month - 1;
}

export function weatherMonthFromValue(value: number): WeatherMonth {
  return { year: Math.floor(value / 12), month: value % 12 + 1 };
}

export function enumerateWeatherMonths(range: WeatherMonthRange): readonly WeatherMonth[] {
  if (!isValidWeatherMonth(range.start) || !isValidWeatherMonth(range.end)) return [];
  const start = weatherMonthValue(range.start);
  const end = weatherMonthValue(range.end);
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => weatherMonthFromValue(start + index));
}
