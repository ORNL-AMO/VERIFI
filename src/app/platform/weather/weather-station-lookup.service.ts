import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { WeatherStation } from '@data/models/degreeDays';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WeatherLocation, WeatherStationCoordinates, WeatherStationResponse } from './weather-station-lookup.models';

@Injectable({ providedIn: 'root' })
export class WeatherStationLookupService {
  private readonly http = inject(HttpClient);
  private readonly textOptions = {
    responseType: 'text' as const,
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  async searchLocations(query: string): Promise<readonly WeatherLocation[]> {
    const cleanedQuery = query.trim();
    if (!cleanedQuery) return [];
    const params = new HttpParams().set('q', cleanedQuery).set('format', 'json');
    const response = await firstValueFrom(this.http.get<unknown>('https://nominatim.openstreetmap.org/search', { params }));
    if (!Array.isArray(response)) throw new Error('The location search returned an invalid response.');
    return response.filter(isWeatherLocation);
  }

  async findStations(
    coordinates: WeatherStationCoordinates,
    radiusMiles = 50
  ): Promise<readonly WeatherStation[]> {
    const now = new Date();
    const response = await firstValueFrom(this.http.post(
      `${environment.weatherApi}/stations`,
      {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radial_distance: radiusMiles,
        start_date: '2013-03-01',
        end_date: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
      },
      this.textOptions
    ));
    return parseStations(response);
  }

  async getStation(stationId: string): Promise<WeatherStation | undefined> {
    if (!stationId.trim()) return undefined;
    const response = await firstValueFrom(this.http.post(
      `${environment.weatherApi}/station/${encodeURIComponent(stationId)}`,
      {},
      this.textOptions
    ));
    const station = parseStations(response)[0];
    return station ? { ...station, ID: stationId } : undefined;
  }
}

export function mapWeatherStation(response: WeatherStationResponse): WeatherStation {
  return {
    name: response.name,
    country: undefined,
    state: response.state ?? '',
    lat: response.lat,
    lon: response.lon,
    begin: new Date(response.data_begin_date),
    end: new Date(response.data_end_date),
    USAF: undefined,
    WBAN: undefined,
    ID: response.station_id,
    distanceFrom: response.distance,
    ratingPercent: response.rating_percent
  };
}

function parseStations(value: string): WeatherStation[] {
  const parsed = JSON.parse(value) as { stations?: unknown };
  if (!Array.isArray(parsed.stations)) throw new Error('The weather station search returned an invalid response.');
  return parsed.stations.filter(isWeatherStationResponse).map(mapWeatherStation);
}

function isWeatherLocation(value: unknown): value is WeatherLocation {
  const candidate = value as Partial<WeatherLocation> | undefined;
  return !!candidate
    && typeof candidate.display_name === 'string'
    && typeof candidate.lat === 'string'
    && typeof candidate.lon === 'string'
    && typeof candidate.place_id === 'number'
    && typeof candidate.addresstype === 'string';
}

function isWeatherStationResponse(value: unknown): value is WeatherStationResponse {
  const candidate = value as Partial<WeatherStationResponse> | undefined;
  return !!candidate
    && typeof candidate.station_id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.data_begin_date === 'string'
    && typeof candidate.data_end_date === 'string'
    && typeof candidate.distance === 'number'
    && typeof candidate.rating_percent === 'number'
    && typeof candidate.lat === 'string'
    && typeof candidate.lon === 'string'
    && (candidate.state === undefined || typeof candidate.state === 'string');
}
