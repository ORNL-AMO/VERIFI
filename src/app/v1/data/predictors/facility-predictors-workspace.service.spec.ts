import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from './facility-predictors-workspace.service';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';

describe('FacilityPredictorsWorkspaceService', () => {
  it('owns sorted predictor collections and grouped weather stations without route state', () => {
    TestBed.configureTestingModule({
      providers: [
        FacilityPredictorsWorkspaceService,
        { provide: PredictorWeatherWorkflowService, useValue: { busy: signal(false) } },
        { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal({ guid: 'account-a' }),
            revision: signal(1),
            selectedFacility: signal({ guid: 'facility-a' }),
            canWrite: signal(true),
            hasPending: signal(false),
            status: signal('ready'),
            facilityPredictors: signal([
              {
                guid: 'weather-a', name: 'Zulu', predictorType: 'Weather', production: false,
                unit: 'F', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare'
              },
              { guid: 'standard-a', name: 'Alpha', predictorType: 'Standard', production: true, unit: 'tons' }
            ]),
            facilityPredictorData: signal([
              { predictorId: 'standard-a', year: 2025, month: 2 },
              { predictorId: 'weather-a', year: 2025, month: 3 }
            ]),
            facilityMeterData: signal([
              { year: 2024, month: 12 },
              { year: 2025, month: 2 }
            ])
          }
        }
      ]
    });

    const service = TestBed.inject(FacilityPredictorsWorkspaceService);
    expect(service.predictors().map(item => item.name)).toEqual(['Alpha', 'Zulu']);
    expect(service.standardPredictorCards().map(card => card.predictor.guid)).toEqual(['standard-a']);
    expect(service.weatherStationGroups()).toHaveLength(1);
    expect(service.defaultWeatherRange()).toEqual({
      start: { year: 2024, month: 12 },
      end: { year: 2025, month: 2 }
    });
  });
});
