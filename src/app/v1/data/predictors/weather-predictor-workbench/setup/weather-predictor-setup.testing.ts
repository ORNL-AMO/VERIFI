import { computed, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { defaultWeatherPredictorName } from '../../models';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';
import { WeatherPredictorSetupComponent } from './weather-predictor-setup.component';

export function createWeatherSetupFixture(options: {
  group?: any;
  groupSignal?: WritableSignal<any>;
  facilitySignal?: WritableSignal<any>;
  revisionSignal?: WritableSignal<number>;
  readingsSignal?: WritableSignal<any[]>;
  creating?: boolean;
  previewStationGroup?: any;
  commitStationGroup?: any;
  defaultRange?: any;
  canWrite?: boolean;
  hasPending?: boolean;
} = {}) {
  const state = signal({ status: 'idle', message: '' });
  const group = options.groupSignal ?? signal(options.group);
  TestBed.configureTestingModule({
    imports: [WeatherPredictorSetupComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        account: signal({ guid: 'account-a' }), revision: options.revisionSignal ?? signal(1),
        defaultWeatherRange: signal('defaultRange' in options
          ? options.defaultRange
          : { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } }),
        facility: options.facilitySignal ?? signal({ guid: 'facility-a', city: 'Oak Ridge', state: 'TN' }),
        predictorReadings: options.readingsSignal ?? signal([]),
        canWrite: signal(options.canWrite ?? true), hasPending: signal(options.hasPending ?? false)
      } },
      {
        provide: WeatherPredictorWorkbenchContextService,
        useValue: {
          group, groupKey: computed(() => group()?.routeKey ?? options.group?.routeKey ?? 'station:station-a'), creating: signal(options.creating ?? true),
          predictors: signal(options.group?.predictors ?? []), readings: signal([]), notFound: signal(false)
        }
      },
      { provide: PredictorWeatherWorkflowService, useValue: {
        state, busy: signal(false), reset: vi.fn(), previewStationSelection: vi.fn(), previewStationGroup: options.previewStationGroup ?? vi.fn(),
        commitStationGroup: options.commitStationGroup ?? vi.fn()
      } },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()), protectBeforeUnload: vi.fn(() => vi.fn()), confirmDiscard: vi.fn(() => true) } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: WorkspaceNavigationService, useValue: { openFacilityInventory: (guid: string, resource: string) => TestBed.inject(Router).navigate(['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', resource], { queryParams: { facility: guid } }),
          facilityInventoryLink: (guid: string, resource: string) => ({ route: ['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', resource], queryParams: { facility: guid } }), facilityDataToolRoute: vi.fn(() => ['/predictors']), facilityWeatherPredictorRoute: vi.fn(() => ['/weather']) } },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: WeatherStationLookupService, useValue: { getStation: vi.fn(), searchLocations: vi.fn(), findStations: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(WeatherPredictorSetupComponent);
  fixture.detectChanges();
  return fixture;
}

export function savedWeatherSetupGroup(types: readonly WeatherDataType[]) {
  return {
    routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
    predictors: types.map((weatherDataType, index) => ({
      guid: `weather-${index}`, name: defaultWeatherPredictorName(weatherDataType, 65), weatherDataType,
      heatingBaseTemperature: weatherDataType === 'HDD' ? 65 : undefined,
      coolingBaseTemperature: weatherDataType === 'CDD' ? 65 : undefined,
      production: index === 0
    }))
  };
}
