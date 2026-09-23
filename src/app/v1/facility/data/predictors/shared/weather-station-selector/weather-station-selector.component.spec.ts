import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { WeatherStationSelectorComponent } from './weather-station-selector.component';

describe('WeatherStationSelectorComponent', () => {
  it('searches a location, loads nearby stations, and emits the selected station', async () => {
    const location = { place_id: 1, display_name: 'Oak Ridge, TN, United States', addresstype: 'city', lat: '36', lon: '-84' };
    const station = { ID: 'station-a', name: 'Oak Ridge', distanceFrom: 2 };
    TestBed.configureTestingModule({
      imports: [WeatherStationSelectorComponent],
      providers: [{ provide: WeatherStationLookupService, useValue: {
        searchLocations: vi.fn(async () => [location]), findStations: vi.fn(async () => [station]), getStation: vi.fn()
      } }]
    });
    const fixture = TestBed.createComponent(WeatherStationSelectorComponent);
    const selected = vi.fn();
    fixture.componentInstance.stationSelected.subscribe(selected);
    fixture.componentInstance.setQuery('Oak Ridge');
    await fixture.componentInstance.search();
    await fixture.componentInstance.chooseLocation(location);
    fixture.componentInstance.selectStation(station as any);

    expect(fixture.componentInstance.locations()).toEqual([location]);
    expect(fixture.componentInstance.stations()).toEqual([station]);
    expect(selected).toHaveBeenCalledWith(station);
  });
});
