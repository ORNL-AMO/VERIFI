import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { HourlyWeatherDataService } from './hourly-weather-data.service';

describe('HourlyWeatherDataService', () => {
  let service: HourlyWeatherDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(HourlyWeatherDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps an inclusive calendar-month range to an exclusive API end date', async () => {
    const promise = firstValueFrom(service.load({
      stationId: 'ABC',
      range: { start: { year: 2025, month: 11 }, end: { year: 2026, month: 2 } }
    }));
    const request = http.expectOne(`${environment.weatherApi}/data`);
    expect(request.request.body).toMatchObject({
      station_id: 'ABC', start_date: '2025-11-1', end_date: '2026-3-1',
      parameters: expect.arrayContaining(['dry_bulb_temp', 'wet_bulb_temp', 'humidity'])
    });
    request.flush(JSON.stringify({ hourly_data: [{ time: '2026-02-01T00:00:00', dry_bulb_temp: '42' }] }));
    await expect(promise).resolves.toEqual([expect.objectContaining({
      time: expect.any(Date), dry_bulb_temp: 42
    })]);
  });

  it('rejects malformed responses', async () => {
    const promise = firstValueFrom(service.load({
      stationId: 'ABC', range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } }
    }));
    http.expectOne(`${environment.weatherApi}/data`).flush('{"unexpected":true}');
    await expect(promise).rejects.toThrow('invalid response');
  });

  it('cancels the HTTP request when unsubscribed', () => {
    const subscription = service.load({
      stationId: 'ABC', range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } }
    }).subscribe();
    const request = http.expectOne(`${environment.weatherApi}/data`);
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
  });
});
