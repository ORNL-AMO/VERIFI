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
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.setName('Weather');
    component.setPredictorType('Weather');
    component.submit();
    expect(submitted).not.toHaveBeenCalled();

    component.selectStation({ ID: 'station-a', name: 'Oak Ridge' } as any);
    component.setBaseTemperature('60');
    component.submit();
    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ predictorType: 'Weather', baseTemperature: 60 }));
  });
});
