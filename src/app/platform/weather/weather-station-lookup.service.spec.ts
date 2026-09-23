import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { WeatherStationLookupService } from './weather-station-lookup.service';

describe('WeatherStationLookupService', () => {
  let service: WeatherStationLookupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WeatherStationLookupService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('maps nearby station responses into the shared station contract', async () => {
    const promise = service.findStations({ latitude: 36, longitude: -84 });
    const request = http.expectOne(`${environment.weatherApi}/stations`);
    expect(request.request.body).toMatchObject({ latitude: 36, longitude: -84, radial_distance: 50 });
    request.flush(JSON.stringify({ stations: [{
      station_id: 'ABC', name: 'Oak Ridge', data_begin_date: '2020-01-01', data_end_date: '2026-01-01',
      distance: 2.5, rating_percent: 98, lat: '36', lon: '-84', state: 'TN'
    }] }));
    await expect(promise).resolves.toEqual([expect.objectContaining({ ID: 'ABC', name: 'Oak Ridge', distanceFrom: 2.5 })]);
  });

  it('returns no locations for an empty query without making a request', async () => {
    await expect(service.searchLocations('  ')).resolves.toEqual([]);
  });

  it('rejects malformed station responses', async () => {
    const promise = service.getStation('ABC');
    http.expectOne(`${environment.weatherApi}/station/ABC`).flush('{"unexpected":true}');
    await expect(promise).rejects.toThrow('invalid response');
  });
});
