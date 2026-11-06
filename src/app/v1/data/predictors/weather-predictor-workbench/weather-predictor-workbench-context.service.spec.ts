import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, UrlSegment, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { WeatherPredictorWorkbenchContextService } from './weather-predictor-workbench-context.service';

describe('WeatherPredictorWorkbenchContextService', () => {
  it('validates creation query types and opens station selection only for new workbenches', () => {
    const parameters = new BehaviorSubject(convertToParamMap({}));
    const url = new BehaviorSubject([new UrlSegment('new', {})]);
    const query = new BehaviorSubject(convertToParamMap({ weatherType: ['CDD', 'unknown', 'relativeHumidity', 'CDD'], selectStation: 'true' }));
    TestBed.configureTestingModule({ providers: [WeatherPredictorWorkbenchContextService,
      { provide: ActivatedRoute, useValue: { paramMap: parameters, url, queryParamMap: query,
        snapshot: { paramMap: parameters.value, url: url.value, queryParamMap: query.value } } },
      { provide: FacilityPredictorsWorkspaceService, useValue: { weatherStationGroups: signal([]), predictorReadings: signal([]) } }
    ] });
    const context = TestBed.inject(WeatherPredictorWorkbenchContextService);
    expect(context.creationTypes()).toEqual(['CDD', 'relativeHumidity']); expect(context.autoOpenStation()).toBe(true);
    query.next(convertToParamMap({ weatherType: ['unknown'] }));
    expect(context.creationTypes()).toEqual(['HDD']); expect(context.autoOpenStation()).toBe(false);
    query.next(convertToParamMap({ weatherType: ['CDD'], selectStation: 'true' }));
    url.next([new UrlSegment('station:saved', {})]);
    expect(context.creationTypes()).toEqual([]); expect(context.autoOpenStation()).toBe(false);
  });

  it('owns weather route selection and reacts to route parameter changes', () => {
    const parameters = new BehaviorSubject(convertToParamMap({ weatherGroupKey: 'station:KORD' }));
    const url = new BehaviorSubject([new UrlSegment('station:KORD', {})]);
    const weatherStationGroups = signal<any[]>([
      { routeKey: 'station:KORD', predictors: [{ guid: 'weather-a' }] },
      { routeKey: 'station:KBOS', predictors: [{ guid: 'weather-b' }] }
    ]);
    const predictorReadings = signal<any[]>([
      { guid: 'reading-a', predictorId: 'weather-a' },
      { guid: 'reading-b', predictorId: 'weather-b' }
    ]);
    TestBed.configureTestingModule({
      providers: [
        WeatherPredictorWorkbenchContextService,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: parameters,
            queryParamMap: of(convertToParamMap({})),
            url,
            snapshot: { paramMap: parameters.value, url: url.value, queryParamMap: convertToParamMap({}) }
          }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: { weatherStationGroups, predictorReadings }
        }
      ]
    });

    const context = TestBed.inject(WeatherPredictorWorkbenchContextService);
    expect(context.group()?.routeKey).toBe('station:KORD');
    expect(context.readings().map(reading => reading.guid)).toEqual(['reading-a']);

    parameters.next(convertToParamMap({ weatherGroupKey: 'station:KBOS' }));
    expect(context.group()?.routeKey).toBe('station:KBOS');
    expect(context.predictors().map(predictor => predictor.guid)).toEqual(['weather-b']);

    parameters.next(convertToParamMap({ weatherGroupKey: 'missing' }));
    expect(context.group()).toBeUndefined();
    expect(context.notFound()).toBe(true);
  });

  it('recognizes the new weather station route', () => {
    const parameters = new BehaviorSubject(convertToParamMap({}));
    const url = new BehaviorSubject([new UrlSegment('new', {})]);
    TestBed.configureTestingModule({
      providers: [
        WeatherPredictorWorkbenchContextService,
        {
          provide: ActivatedRoute,
          useValue: { paramMap: parameters, queryParamMap: of(convertToParamMap({})), url, snapshot: { paramMap: parameters.value, url: url.value, queryParamMap: convertToParamMap({}) } }
        },
        {
          provide: FacilityPredictorsWorkspaceService,
          useValue: { weatherStationGroups: signal([]), predictorReadings: signal([]) }
        }
      ]
    });

    expect(TestBed.inject(WeatherPredictorWorkbenchContextService).creating()).toBe(true);
  });
});
