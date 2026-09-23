import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { PredictorDraftSlideoutComponent } from './predictor-draft-slideout.component';

describe('PredictorDraftSlideoutComponent', () => {
  it('requires weather setup before emitting a weather predictor draft', () => {
    TestBed.configureTestingModule({
      imports: [PredictorDraftSlideoutComponent],
      providers: [{ provide: WeatherStationLookupService, useValue: { getStation: vi.fn(), searchLocations: vi.fn(), findStations: vi.fn() } }]
    });
    const fixture = TestBed.createComponent(PredictorDraftSlideoutComponent);
    const component = fixture.componentInstance;
    const previewRequested = vi.fn();
    component.weatherPreviewRequested.subscribe(previewRequested);
    component.setPredictorType('Weather');
    component.submit();
    expect(previewRequested).not.toHaveBeenCalled();

    component.selectStation({ ID: 'station-a', name: 'Oak Ridge' } as any);
    component.setWeatherStart('2026-01');
    component.setWeatherEnd('2026-03');
    component.submit();
    expect(previewRequested).toHaveBeenCalledWith(expect.objectContaining({
      station: expect.objectContaining({ ID: 'station-a' }),
      definitions: [expect.objectContaining({ weatherDataType: 'HDD', baseTemperature: 60 })]
    }));
  });
});
