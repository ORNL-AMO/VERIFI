import { Directive, Input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherStationSelectorComponent } from './weather-station-selector.component';

describe('WeatherStationSelectorComponent', () => {
  it('opens station selection in a slideout and hides other locations after one is chosen', async () => {
    const location = { place_id: 1, display_name: 'Oak Ridge, TN, United States', addresstype: 'city', lat: '36', lon: '-84' };
    const secondLocation = { place_id: 2, display_name: 'Oak Ridge, NC, United States', addresstype: 'village', lat: '36.1', lon: '-80' };
    const station = { ID: 'station-a', name: 'Oak Ridge', distanceFrom: 2, ratingPercent: 98 };
    const previewStationSelection = vi.fn(async () => stationPreview(station as any, 2));
    configureTestingModule({
      imports: [WeatherStationSelectorComponent],
      providers: [
        { provide: WeatherStationLookupService, useValue: {
          searchLocations: vi.fn(async () => [location, secondLocation]), findStations: vi.fn(async () => [station]), getStation: vi.fn()
        } },
        workflowProvider(previewStationSelection)
      ]
    });
    const fixture = TestBed.createComponent(WeatherStationSelectorComponent);
    fixture.componentRef.setInput('previewRange', { start: { year: 2026, month: 1 }, end: { year: 2026, month: 2 } });
    fixture.componentRef.setInput('previewDefinitions', [{ weatherDataType: 'HDD', name: 'HDD 60', baseTemperature: 60 }]);
    const selected = vi.fn();
    fixture.componentInstance.stationSelected.subscribe(selected);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-workspace-slideout')).toBeNull();
    fixture.componentInstance.openSelector();
    fixture.componentInstance.setQuery('Oak Ridge');
    await fixture.componentInstance.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Location results"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(secondLocation.display_name);

    await fixture.componentInstance.chooseLocation(location);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Location results"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(secondLocation.display_name);
    expect(fixture.nativeElement.querySelector('[aria-label="Weather station results"]')).not.toBeNull();
    const icons = fixture.debugElement.queryAll(By.directive(IconComponent)).map(element => element.componentInstance.name);
    expect(icons).toContain('location');
    expect(icons).toContain('cloudRain');

    await fixture.componentInstance.selectStation(station as any);
    fixture.detectChanges();

    expect(fixture.componentInstance.locations()).toEqual([secondLocation, location]);
    expect(fixture.componentInstance.stations()).toEqual([station]);
    expect(previewStationSelection).toHaveBeenCalled();
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[aria-label="Weather station results"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('There are 2 months with gaps in the data.');
    expect(fixture.nativeElement.querySelector('[role="img"]')).not.toBeNull();

    fixture.componentInstance.confirmStation();
    fixture.detectChanges();

    expect(selected).toHaveBeenCalledWith(station);
    expect(fixture.componentInstance.selectorOpen()).toBe(false);
  });

  it('lets the user return to the location list before selecting a station', async () => {
    const location = { place_id: 1, display_name: 'Oak Ridge, TN, United States', addresstype: 'city', lat: '36', lon: '-84' };
    configureTestingModule({
      imports: [WeatherStationSelectorComponent],
      providers: [
        { provide: WeatherStationLookupService, useValue: {
          searchLocations: vi.fn(async () => [location]), findStations: vi.fn(async () => []), getStation: vi.fn()
        } },
        workflowProvider()
      ]
    });
    const fixture = TestBed.createComponent(WeatherStationSelectorComponent);
    fixture.detectChanges();
    fixture.componentInstance.openSelector();
    fixture.componentInstance.setQuery('Oak Ridge');
    await fixture.componentInstance.search();
    await fixture.componentInstance.chooseLocation(location);
    fixture.componentInstance.changeLocation();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedLocation()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('[aria-label="Location results"]')).not.toBeNull();
  });

  it('keeps a successfully verified saved station available', async () => {
    const station = { ID: 'station-a', name: 'Oak Ridge', distanceFrom: 0, ratingPercent: 99 };
    configureTestingModule({
      imports: [WeatherStationSelectorComponent],
      providers: [
        { provide: WeatherStationLookupService, useValue: {
          searchLocations: vi.fn(), findStations: vi.fn(), getStation: vi.fn(async () => station)
        } },
        workflowProvider()
      ]
    });
    const fixture = TestBed.createComponent(WeatherStationSelectorComponent);
    fixture.componentRef.setInput('selectedStationId', station.ID);
    fixture.componentRef.setInput('selectedStationName', station.name);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentStationUnavailable()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('saved station is unavailable');
  });
});

@Directive({ selector: '[appV1ECharts]', standalone: true })
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
}

function configureTestingModule(config: Parameters<typeof TestBed.configureTestingModule>[0]): void {
  TestBed.configureTestingModule(config);
  TestBed.overrideComponent(WeatherStationSelectorComponent, {
    remove: { imports: [EChartsChartDirective] },
    add: { imports: [EChartsStubDirective] }
  });
}

function workflowProvider(previewStationSelection = vi.fn()) {
  return {
    provide: PredictorWeatherWorkflowService,
    useValue: {
      state: signal({ status: 'idle', message: '' }),
      busy: signal(false),
      previewStationSelection,
      reset: vi.fn()
    }
  };
}

function stationPreview(station: any, warningCount: number) {
  const points = [1, 2].map(month => ({
    month: { year: 2026, month }, monthLabel: month === 1 ? 'Jan 2026' : 'Feb 2026', amount: month * 10, warning: month <= warningCount
  }));
  return {
    station,
    range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 2 } },
    series: [{ key: 'hdd', name: 'HDD 60', weatherDataType: 'HDD', unit: 'days', points }],
    warningMonths: points.filter(point => point.warning).map(point => point.month)
  };
}
