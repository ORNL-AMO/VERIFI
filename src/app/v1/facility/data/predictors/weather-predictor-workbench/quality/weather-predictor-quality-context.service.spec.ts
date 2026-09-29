import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';
import { WeatherPredictorQualityContextService } from './weather-predictor-quality-context.service';

describe('WeatherPredictorQualityContextService', () => {
  it('owns quality selection, report data, and weather route navigation', () => {
    const routeParameters = new BehaviorSubject(convertToParamMap({ predictorGuid: 'weather-b' }));
    const navigate = vi.fn();
    const predictors = signal<any[]>([
      { guid: 'weather-a', name: 'HDD 65' },
      { guid: 'weather-b', name: 'CDD 70' }
    ]);
    const group = signal<any>({
      routeKey: 'station:KORD',
      statusFindings: [
        { id: 'a', entity: { kind: 'predictor', guid: 'weather-a' } },
        { id: 'b', entity: { kind: 'predictor', guid: 'weather-b' } }
      ]
    });
    TestBed.configureTestingModule({
      providers: [
        WeatherPredictorQualityContextService,
        {
          provide: ActivatedRoute,
          useValue: { paramMap: routeParameters, snapshot: { paramMap: routeParameters.value } }
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            facilityWeatherPredictorRoute: (_facility: string, key: string, tab: string) =>
              ['/weather', key, tab]
          }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: { facility: signal({ guid: 'facility-a' }) }
        },
        {
          provide: WeatherPredictorWorkbenchContextService,
          useValue: {
            group,
            predictors,
            readings: signal([
              { guid: 'reading-a', predictorId: 'weather-a' },
              { guid: 'reading-b', predictorId: 'weather-b' }
            ])
          }
        }
      ]
    });

    const context = TestBed.inject(WeatherPredictorQualityContextService);
    expect(context.predictor()?.guid).toBe('weather-b');
    expect(context.readings().map(reading => reading.guid)).toEqual(['reading-b']);
    expect(context.findings().map(finding => finding.id)).toEqual(['b']);
    expect(context.settingsLabel).toBe('Open Setup');

    context.openSettings();
    expect(navigate).toHaveBeenCalledWith(['/weather', 'station:KORD', 'setup']);

    routeParameters.next(convertToParamMap({ predictorGuid: 'weather-a' }));
    expect(context.predictor()?.guid).toBe('weather-a');
  });
});
