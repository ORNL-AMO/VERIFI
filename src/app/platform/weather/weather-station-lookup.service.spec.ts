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

  it('accepts numeric coordinates returned by the live stations API', async () => {
    const promise = service.findStations({ latitude: 36.0104, longitude: -84.2696 });
    http.expectOne(`${environment.weatherApi}/stations`).flush(JSON.stringify({ stations: [{
      station_id: '72427053868', name: 'Oak Ridge', data_begin_date: '2013-03-01', data_end_date: '2026-09-05',
      distance: 2.2, rating_percent: 98.85, lat: 36.0231, lon: -84.2336, state: 'TN'
    }] }));

    await expect(promise).resolves.toEqual([expect.objectContaining({
      ID: '72427053868', lat: '36.0231', lon: '-84.2336'
    })]);
  });

  it('accepts saved-station responses that omit nearby-search distance', async () => {
    const promise = service.getStation('72427053868');
    http.expectOne(`${environment.weatherApi}/station/72427053868`).flush(JSON.stringify({ stations: [{
      station_id: '72427053868', name: 'OAK RIDGE', data_begin_date: '2010-08-01', data_end_date: '2026-09-05',
      rating_percent: 99.29, lat: 36.0231, lon: -84.2336, state: 'TN'
    }] }));

    await expect(promise).resolves.toEqual(expect.objectContaining({
      ID: '72427053868', name: 'OAK RIDGE', distanceFrom: 0
    }));
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
