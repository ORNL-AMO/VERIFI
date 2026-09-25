import { Directive, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import {
  WeatherSourceReadingsSlideoutComponent,
  buildWeatherSourceReadingChart
} from './weather-source-readings-slideout.component';

describe('WeatherSourceReadingsSlideoutComponent', () => {
  it('maps the predictor source metric and identifies gaps longer than 12 hours', () => {
    const chart = buildWeatherSourceReadingChart(
      predictor('HDD'),
      { year: 2026, month: 1 },
      [
        reading('2026-01-01T00:00:00', { dry_bulb_temp: 40 }),
        reading('2026-01-01T01:00:00', { dry_bulb_temp: 41 }),
        reading('2026-01-02T02:00:00', { dry_bulb_temp: 42 })
      ]
    );

    expect(chart.sourceLabel).toBe('Dry bulb temperature');
    expect(chart.unit).toBe('°F');
    expect(chart.points.map(point => point.value)).toEqual([40, 41, 42]);
    expect(chart.gaps).toHaveLength(2);
    expect(chart.missingValueCount).toBe(0);
  });

  it('shows missing values for the source used by the selected predictor', () => {
    const chart = buildWeatherSourceReadingChart(
      predictor('relativeHumidity'),
      { year: 2026, month: 1 },
      [
        reading('2026-01-01T00:00:00', { dry_bulb_temp: 40, humidity: 45 }),
        reading('2026-01-01T01:00:00', { dry_bulb_temp: 41, humidity: undefined })
      ]
    );

    expect(chart.sourceLabel).toBe('Relative humidity');
    expect(chart.unit).toBe('%');
    expect(chart.points.map(point => point.value)).toEqual([45, null]);
    expect(chart.missingValueCount).toBe(1);
  });

  it('loads the selected station month and renders the accessible time chart', async () => {
    const load = vi.fn(() => of([
      reading('2026-01-01T00:00:00', { dry_bulb_temp: 40 }),
      reading('2026-01-02T02:00:00', { dry_bulb_temp: 42 })
    ]));
    const fixture = setup(load);
    fixture.componentRef.setInput('predictor', predictor('HDD'));
    fixture.componentRef.setInput('month', { year: 2026, month: 1 });
    fixture.componentRef.setInput('monthLabel', 'Jan 2026');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(load).toHaveBeenCalledWith({
      stationId: 'station-a',
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } }
    });
    expect(fixture.nativeElement.querySelector('[role="img"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('gaps longer than 12 hours');
    expect(fixture.nativeElement.textContent).toContain('2 source readings');
    expect(fixture.nativeElement.querySelector('caption').textContent).toContain('HDD 55 source readings for Jan 2026');
    const gapDetails = fixture.nativeElement.querySelectorAll('.weather-source-readings__gap-list li');
    expect(gapDetails).toHaveLength(2);
    expect(normalizedText(gapDetails[0])).toContain('There is a gap from Jan 1, 2026, 12:00 AM to Jan 2, 2026, 2:00 AM.');
    expect(normalizedText(gapDetails[1])).toContain('There is a gap from Jan 2, 2026, 2:00 AM to Feb 1, 2026, 12:00 AM.');
  });

  it('shows a retry action when source readings cannot be loaded', async () => {
    const load = vi.fn()
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of([reading('2026-01-01T00:00:00', { dry_bulb_temp: 40 })]));
    const fixture = setup(load);
    fixture.componentRef.setInput('predictor', predictor('HDD'));
    fixture.componentRef.setInput('month', { year: 2026, month: 1 });
    fixture.componentRef.setInput('monthLabel', 'Jan 2026');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be loaded');
    const root = fixture.nativeElement as HTMLElement;
    const retry = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Try again'))!;
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(load).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="img"]')).not.toBeNull();
  });

  it('shows an empty state when the station has no hourly readings for the month', async () => {
    const fixture = setup(vi.fn(() => of([])));
    fixture.componentRef.setInput('predictor', predictor('HDD'));
    fixture.componentRef.setInput('month', { year: 2026, month: 1 });
    fixture.componentRef.setInput('monthLabel', 'Jan 2026');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hourly source readings');
    expect(fixture.nativeElement.querySelector('[role="img"]')).toBeNull();
  });
});

@Directive({ selector: '[appV1ECharts]', standalone: true })
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
}

function setup(load: ReturnType<typeof vi.fn>) {
  TestBed.configureTestingModule({
    imports: [WeatherSourceReadingsSlideoutComponent],
    providers: [{ provide: HourlyWeatherDataService, useValue: { load } }]
  });
  TestBed.overrideComponent(WeatherSourceReadingsSlideoutComponent, {
    remove: { imports: [EChartsChartDirective] },
    add: { imports: [EChartsStubDirective] }
  });
  return TestBed.createComponent(WeatherSourceReadingsSlideoutComponent);
}

function predictor(weatherDataType: IdbPredictor['weatherDataType']): IdbPredictor {
  return {
    guid: 'predictor-a', name: 'HDD 55', predictorType: 'Weather', weatherDataType,
    weatherStationId: 'station-a', weatherStationName: 'Station A'
  } as IdbPredictor;
}

function reading(time: string, values: Record<string, number | undefined>) {
  return { time: new Date(time), ...values };
}

function normalizedText(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}
