import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityPredictorsWorkspaceService } from './facility-predictors-workspace.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';

describe('FacilityPredictorsWorkspaceService', () => {
  it('sorts predictors and resolves selected predictor readings from the route', () => {
    const events = new Subject<unknown>();
    const predictors = signal([
      { guid: 'z', name: 'Zulu', predictorType: 'Weather', production: false, unit: 'F' },
      { guid: 'a value', name: 'Alpha', predictorType: 'Standard', production: true, unit: 'tons' }
    ] as any[]);
    const readings = signal([
      { predictorId: 'a value', year: 2025, month: 2 },
      { predictorId: 'z', year: 2025, month: 3 }
    ] as any[]);

    TestBed.configureTestingModule({
      providers: [
        FacilityPredictorsWorkspaceService,
        { provide: PredictorWeatherWorkflowService, useValue: { busy: signal(false) } },
        { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } },
        { provide: Router, useValue: { url: '/v1/workspace/facility/f/data/predictors', events } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal({ guid: 'account-a' }),
            selectedFacility: signal({ guid: 'facility-a' }),
            canWrite: signal(true),
            hasPending: signal(false),
            status: signal('ready'),
            facilityPredictors: predictors,
            facilityPredictorData: readings,
            facilityMeterData: signal([])
          }
        }
      ]
    });

    const service = TestBed.inject(FacilityPredictorsWorkspaceService);
    expect(service.predictors().map(item => item.name)).toEqual(['Alpha', 'Zulu']);
    expect(service.selectedPredictor()).toBeUndefined();

    events.next(new NavigationEnd(1, '', '/v1/workspace/facility/f/data/predictors/a%20value/readings'));

    expect(service.selectedPredictor()?.name).toBe('Alpha');
    expect(service.selectedReadings()).toHaveLength(1);
    expect(service.selectedPredictorCard()?.firstReadingLabel).toBe('Feb 2025');
    expect(service.predictorNotFound()).toBe(false);

    events.next(new NavigationEnd(2, '', '/v1/workspace/facility/f/data/predictors/missing/settings'));
    expect(service.selectedPredictor()).toBeUndefined();
    expect(service.predictorNotFound()).toBe(true);

    events.next(new NavigationEnd(3, '', '/v1/workspace/facility/f/data/predictors/weather/predictor%3Az/readings'));
    expect(service.selectedWeatherGroup()?.routeKey).toBe('predictor:z');
    expect(service.selectedPredictor()).toBeUndefined();
    expect(service.selectedWeatherReadings()).toHaveLength(1);
  });

  it('does not treat unrelated routes as selected predictors', () => {
    const events = new Subject<unknown>();
    TestBed.configureTestingModule({
      providers: [
        FacilityPredictorsWorkspaceService,
        { provide: PredictorWeatherWorkflowService, useValue: { busy: signal(false) } },
        { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } },
        { provide: Router, useValue: { url: '/v1/workspace/facility/f/data/meters/predictors/settings', events } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal(undefined),
            selectedFacility: signal(undefined),
            canWrite: signal(false),
            hasPending: signal(false),
            status: signal('ready'),
            facilityPredictors: signal([]),
            facilityPredictorData: signal([]),
            facilityMeterData: signal([])
          }
        }
      ]
    });

    expect(TestBed.inject(FacilityPredictorsWorkspaceService).hasPredictorRoute()).toBe(false);
  });
});
