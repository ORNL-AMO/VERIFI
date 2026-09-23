import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ALL_WEATHER_DATA_PARAMETERS,
  HourlyWeatherDataRequest,
  HourlyWeatherReading,
  WeatherMonth,
  isValidWeatherMonth,
  weatherMonthValue
} from './hourly-weather-data.models';

@Injectable({ providedIn: 'root' })
export class HourlyWeatherDataService {
  private readonly http = inject(HttpClient);
  private readonly textOptions = {
    responseType: 'text' as const,
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  load(request: HourlyWeatherDataRequest): Observable<readonly HourlyWeatherReading[]> {
    const stationId = request.stationId.trim();
    if (!stationId) throw new Error('A weather station is required.');
    if (!isValidWeatherMonth(request.range.start) || !isValidWeatherMonth(request.range.end)
      || weatherMonthValue(request.range.end) < weatherMonthValue(request.range.start)) {
      throw new Error('Enter a valid weather month range.');
    }
    return this.http.post(
      `${environment.weatherApi}/data`,
      {
        station_id: stationId,
        start_date: formatApiMonthStart(request.range.start),
        end_date: formatApiMonthStart(nextWeatherMonth(request.range.end)),
        // The existing VERIFI weather workflow always requests the complete hourly
        // source record because degree-day and warning calculations share fields.
        parameters: [...ALL_WEATHER_DATA_PARAMETERS]
      },
      this.textOptions
    ).pipe(map(parseHourlyWeatherResponse));
  }
}

export function parseHourlyWeatherResponse(response: string): readonly HourlyWeatherReading[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    throw new Error('The weather service returned an invalid response.');
  }
  const hourlyData = (parsed as { hourly_data?: unknown } | undefined)?.hourly_data;
  if (!Array.isArray(hourlyData)) throw new Error('The weather service returned an invalid response.');
  return hourlyData.map((value, index) => mapHourlyWeatherReading(value, index));
}

function mapHourlyWeatherReading(value: unknown, index: number): HourlyWeatherReading {
  const candidate = value as Record<string, unknown> | undefined;
  const time = new Date(candidate?.['time'] as string | number | Date);
  if (!candidate || Number.isNaN(time.getTime())) {
    throw new Error(`The weather service returned an invalid hourly reading at position ${index + 1}.`);
  }
  return {
    time,
    dry_bulb_temp: optionalNumber(candidate['dry_bulb_temp']),
    humidity: optionalNumber(candidate['humidity']),
    dew_point_temp: optionalNumber(candidate['dew_point_temp']),
    wet_bulb_temp: optionalNumber(candidate['wet_bulb_temp']),
    pressure: optionalNumber(candidate['pressure']),
    precipitation: optionalNumber(candidate['precipitation']),
    wind_speed: optionalNumber(candidate['wind_speed'])
  };
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function nextWeatherMonth(month: WeatherMonth): WeatherMonth {
  return month.month === 12
    ? { year: month.year + 1, month: 1 }
    : { year: month.year, month: month.month + 1 };
}

function formatApiMonthStart(month: WeatherMonth): string {
  return `${month.year}-${month.month}-1`;
}
