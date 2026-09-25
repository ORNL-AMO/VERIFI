import { Component, Directive, EventEmitter, Input, Output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import {
  EChartsChartDirective,
  V1EChartsOption,
  V1EChartsPointClickEvent
} from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WeatherStationSelectionPreview } from '../../models';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherSourceReadingsSlideoutComponent } from '../../weather-predictor-workbench/readings/weather-source-readings-slideout/weather-source-readings-slideout.component';
import {
  WeatherStationSelectorComponent,
  buildStationPreviewChartOption,
  formatStationPreviewTooltip
} from './weather-station-selector.component';

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
    expect(fixture.nativeElement.textContent).toContain('Inspect hourly gaps');

    const chart = fixture.debugElement.query(By.directive(EChartsStubDirective)).injector.get(EChartsStubDirective);
    const option = fixture.componentInstance.previewChartOption() as unknown as { series: Array<{ name: string }> };
    expect(option.series.at(-1)?.name).toBe('Months with Gaps');

    chart.chartPointClicked.emit({ componentType: 'series', seriesIndex: 0, dataIndex: 0 });
    fixture.detectChanges();

    const sourceReadings = fixture.debugElement.query(By.directive(WeatherSourceReadingsSlideoutStubComponent));
    expect(sourceReadings).not.toBeNull();
    expect(sourceReadings.componentInstance.embedded).toBe(true);
    expect(sourceReadings.componentInstance.month).toEqual({ year: 2026, month: 1 });
    expect(sourceReadings.componentInstance.predictor).toEqual(expect.objectContaining({
      name: 'HDD 60', weatherDataType: 'HDD', weatherStationId: 'station-a'
    }));
    expect(fixture.nativeElement.querySelectorAll('app-workspace-slideout')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Hourly source detail');
    expect(fixture.nativeElement.textContent).toContain('Jan 2026 · HDD 60');
    const backToPreview = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.weather-station-selector__source-detail-heading button')!;
    backToPreview.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-weather-source-readings-slideout')).toBeNull();
    expect(fixture.nativeElement.querySelector('.weather-station-selector__preview-chart')).not.toBeNull();

    const inspectMonth = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.weather-station-selector__gap-actions button')!;
    inspectMonth.click();
    fixture.detectChanges();
    const keyboardSourceReadings = fixture.debugElement.query(By.directive(WeatherSourceReadingsSlideoutStubComponent));
    expect(keyboardSourceReadings.componentInstance.month).toEqual({ year: 2026, month: 1 });
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.weather-station-selector__source-detail-heading button')!
      .click();
    fixture.detectChanges();

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

  it('rounds monthly hover values to one decimal place and labels warning points', () => {
    const tooltip = formatStationPreviewTooltip({
      name: 'Jan 2026',
      seriesName: 'HDD 60 (days)',
      marker: '<span></span>',
      value: [Date.UTC(2026, 0, 1), 12.345],
      data: { warning: true }
    });

    expect(tooltip).toContain('HDD 60 (days): 12.3 · gap in source data');
    expect(tooltip).not.toContain('12.345');
  });

  it('ignores clicks on monthly points without source-data gaps', () => {
    const preview = stationPreview({ ID: 'station-a', name: 'Oak Ridge' } as any, 0);
    const option = buildStationPreviewChartOption(preview) as unknown as { series: Array<{ name: string }> };
    expect(option.series.at(-1)?.name).toBe('Months with Gaps');

    configureTestingModule({
      imports: [WeatherStationSelectorComponent],
      providers: [
        { provide: WeatherStationLookupService, useValue: {
          searchLocations: vi.fn(), findStations: vi.fn(), getStation: vi.fn()
        } },
        workflowProvider()
      ]
    });
    const fixture = TestBed.createComponent(WeatherStationSelectorComponent);
    fixture.componentInstance.candidateStation.set({ ID: 'station-a', name: 'Oak Ridge' } as any);
    fixture.componentInstance.stationPreview.set(preview);
    fixture.componentInstance.inspectPreviewPoint({ componentType: 'series', seriesIndex: 0, dataIndex: 0 });

    expect(fixture.componentInstance.sourceInspection()).toBeUndefined();
  });
});

@Directive({ selector: '[appV1ECharts]', standalone: true })
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
  @Output() readonly chartPointClicked = new EventEmitter<V1EChartsPointClickEvent>();
}

@Component({
  selector: 'app-weather-source-readings-slideout',
  template: '',
  standalone: true
})
class WeatherSourceReadingsSlideoutStubComponent {
  @Input({ required: true }) predictor!: unknown;
  @Input({ required: true }) month!: unknown;
  @Input({ required: true }) monthLabel = '';
  @Input() embedded = false;
  @Output() readonly closed = new EventEmitter<void>();
}

function configureTestingModule(config: Parameters<typeof TestBed.configureTestingModule>[0]): void {
  TestBed.configureTestingModule(config);
  TestBed.overrideComponent(WeatherStationSelectorComponent, {
    remove: { imports: [EChartsChartDirective, WeatherSourceReadingsSlideoutComponent] },
    add: { imports: [EChartsStubDirective, WeatherSourceReadingsSlideoutStubComponent] }
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

function stationPreview(station: any, warningCount: number): WeatherStationSelectionPreview {
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
