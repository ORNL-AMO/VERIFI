import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { WeatherPredictorWorkbenchContextService } from './weather-predictor-workbench-context.service';
import { WeatherPredictorWorkbenchComponent } from './weather-predictor-workbench.component';

describe('WeatherPredictorWorkbenchComponent', () => {
  it('renders one quality tab per predictor and routes the selected report', () => {
    const events = new Subject<unknown>();
    const navigate = vi.fn();
    const weatherEntity = (guid: string, name: string) => ({
      kind: 'predictor' as const, guid, name, accountGuid: 'account-a', facilityGuid: 'facility-a'
    });
    const group = signal<any>({
      routeKey: 'station:KORD',
      stationId: 'KORD',
      stationName: 'Chicago O’Hare',
      predictors: [
        { guid: 'weather-a', name: 'HDD 65', predictorType: 'Weather' },
        { guid: 'weather-b', name: 'CDD 70', predictorType: 'Weather' }
      ],
      predictorCards: [
        {
          predictor: { guid: 'weather-a', name: 'HDD 65' }, icon: 'thermometerSnowflake',
          weatherTypeLabel: 'Heating degree days', baseTemperatureLabel: '65°F heating base'
        },
        {
          predictor: { guid: 'weather-b', name: 'CDD 70' }, icon: 'thermometerSun',
          weatherTypeLabel: 'Cooling degree days', baseTemperatureLabel: '70°F cooling base'
        }
      ],
      predictorSummary: 'Heating degree days, Cooling degree days',
      readingCount: 24,
      firstReadingLabel: 'Jan 2025',
      latestReadingLabel: 'Dec 2026',
      statusTone: 'warning',
      statusLabel: 'Needs review',
      statusFindings: presentFindings([
        makeFinding('predictor.weather.warning', 'warning', 'quality', weatherEntity('weather-a', 'HDD 65')),
        makeFinding('predictor.weather.warning', 'warning', 'quality', weatherEntity('weather-b', 'CDD 70')),
        makeFinding('predictor.quality.outlier', 'warning', 'quality', weatherEntity('weather-b', 'CDD 70'), {
          count: 1, periods: ['2025-12']
        })
      ])
    });
    const qualitySnapshot = {
      data: { weatherTab: 'quality' },
      paramMap: { get: (key: string) => key === 'predictorGuid' ? 'weather-b' : null },
      firstChild: null
    };
    const routeSnapshot = {
      data: {},
      firstChild: { data: {}, firstChild: qualitySnapshot }
    };
    TestBed.configureTestingModule({
      imports: [WeatherPredictorWorkbenchComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            events,
            navigate,
            createUrlTree: vi.fn(() => ({})),
            serializeUrl: vi.fn(() => '/account/predictors')
          }
        },
        { provide: ActivatedRoute, useValue: { snapshot: routeSnapshot } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            accountDataRoute: () => ['/account', 'data'],
            facilityDataRoute: () => ['/facility', 'predictors'],
            facilityPredictorRoute: (_facility: string, predictor: string, tab: string) =>
              ['/predictors', predictor, tab],
            facilityWeatherPredictorRoute: (_facility: string, key: string, tab = 'setup') => ['/weather', key, tab],
            facilityWeatherPredictorQualityRoute: (_facility: string, key: string, predictor: string) =>
              ['/weather', key, 'quality', predictor]
          }
        },
        { provide: WorkspaceStatusService, useValue: { predictorFindings: vi.fn(() => []) } },
        {
          provide: WeatherPredictorWorkbenchContextService,
          useValue: {
            creating: signal(false), group, predictors: signal(group().predictors),
            readings: signal([]), notFound: signal(false)
          }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            facility: signal({ guid: 'facility-a', name: 'Facility A' }),
            creatingWeatherGroup: signal(false),
            selectedWeatherGroup: group,
            selectedWeatherPredictors: signal(group().predictors),
            standardPredictorCards: signal([{
              predictor: { guid: 'standard-a', name: 'Production' }, icon: 'package'
            }]),
            weatherStationGroups: signal([group()]),
            weatherGroupNotFound: signal(false)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(WeatherPredictorWorkbenchComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('quality:weather-b');
    expect(fixture.componentInstance.tabs().map(tab => tab.label)).toEqual([
      'Setup', 'Readings', 'HDD 65 Quality', 'CDD 70 Quality'
    ]);
    expect(fixture.nativeElement.querySelectorAll('.v1-data-tabs__tab')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent).toContain('CDD 70 Quality');
    expect(fixture.nativeElement.querySelector('.weather-workbench__predictors')?.textContent).toContain('HDD 65');
    expect(fixture.nativeElement.querySelector('.weather-workbench__predictors')?.textContent).toContain('CDD 70');
    expect(fixture.nativeElement.querySelectorAll('.v1-data-workbench-actions .v1-chip')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.v1-data-workbench-actions')?.textContent).toContain('Needs review');
    expect(fixture.nativeElement.textContent).not.toContain('output');
    expect(fixture.nativeElement.querySelector('.v1-data-workbench-status-notes')?.textContent)
      .toContain('Readings: Review weather data — 2 predictors: CDD 70, HDD 65');
    expect(fixture.nativeElement.querySelector('.v1-data-workbench-status-notes')?.textContent)
      .toContain('CDD 70 Quality: Review predictor outliers');
    expect(fixture.componentInstance.tabAttention().readings?.total).toBe(2);
    expect(fixture.componentInstance.tabAttention()['quality:weather-b']?.total).toBe(1);

    fixture.componentInstance.toggleSwitcher();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-data-workbench-switcher-menu')?.textContent)
      .toContain('Production');
    fixture.componentInstance.switchStandardPredictor('standard-a');
    expect(navigate).toHaveBeenLastCalledWith(['/predictors', 'standard-a', 'quality']);

    fixture.componentInstance.openTab('quality:weather-a');
    expect(navigate).toHaveBeenLastCalledWith(['/weather', 'station:KORD', 'quality', 'weather-a']);

    fixture.componentInstance.openTab('readings');
    expect(navigate).toHaveBeenLastCalledWith(['/weather', 'station:KORD', 'readings']);

    qualitySnapshot.data.weatherTab = 'readings';
    events.next(new NavigationEnd(1, '', '/weather/station%3AKORD/readings'));
    expect(fixture.componentInstance.activeTab()).toBe('readings');
  });
});
