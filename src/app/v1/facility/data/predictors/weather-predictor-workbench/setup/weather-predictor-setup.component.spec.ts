import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherPredictorSetupComponent } from './weather-predictor-setup.component';

describe('WeatherPredictorSetupComponent', () => {
  it('prepares a save summary with repeated weather variants', async () => {
    const preview = {
      workspaceRevision: 1, station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      addPredictors: [], updatePredictors: [], deletePredictors: [],
      addReadings: [], updateReadings: [], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    const previewStationGroup = vi.fn(async () => preview);
    const fixture = createFixture({ previewStationGroup });
    const component = fixture.componentInstance;

    expect(component.definitions()).toHaveLength(1);
    component.addDefinition('HDD');
    component.selectStation({ ID: 'station-a', name: 'Station A' } as any);
    await component.saveAndUpdateReadings();

    expect(previewStationGroup).toHaveBeenCalledWith(expect.objectContaining({
      station: expect.objectContaining({ ID: 'station-a' }),
      definitions: [
        expect.objectContaining({ weatherDataType: 'HDD', baseTemperature: 60 }),
        expect.objectContaining({ weatherDataType: 'HDD', baseTemperature: 60 })
      ]
    }), [], []);
    expect(component.preview()).toBe(preview);
    expect(TestBed.inject(ModalPortalService).show).toHaveBeenCalledOnce();
  });

  it('allows an existing station to prepare removal of its final output', async () => {
    const group = {
      routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
      predictors: [{ guid: 'weather-a', name: 'HDD', weatherDataType: 'HDD', heatingBaseTemperature: 60, production: false }]
    };
    const previewStationGroup = vi.fn(async () => undefined);
    const fixture = createFixture({ group, creating: false, previewStationGroup });
    const component = fixture.componentInstance;
    component.removeDefinition(component.definitions()[0].draftId);

    expect(component.canSubmit()).toBe(true);
    await component.saveAndUpdateReadings();
    expect(previewStationGroup).toHaveBeenCalledWith(
      expect.objectContaining({ definitions: [] }), group.predictors, []
    );
  });

  it('commits the reviewed changes before presenting the saved summary', async () => {
    const preview = {
      workspaceRevision: 1, station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      addPredictors: [{}], updatePredictors: [], deletePredictors: [],
      addReadings: [{}, {}], updateReadings: [{}], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    const commitStationGroup = vi.fn(async () => undefined);
    const fixture = createFixture({ previewStationGroup: vi.fn(async () => preview), commitStationGroup });
    const component = fixture.componentInstance;
    component.selectStation({ ID: 'station-a', name: 'Station A' } as any);

    await component.saveAndUpdateReadings();
    await component.confirmSaveAndUpdateReadings();

    expect(commitStationGroup).toHaveBeenCalledWith(preview);
    expect(component.saveCompleted()).toBe(true);
    expect(component.dirty()).toBe(false);
  });

  it('uses the simplified setup labels and top save action', () => {
    const fixture = createFixture();
    const text = fixture.nativeElement.textContent;
    const saveButton = fixture.nativeElement.querySelector('.weather-setup__top-actions button');
    const stationSelector = fixture.nativeElement.querySelector('app-weather-station-selector');
    const dateRange = fixture.nativeElement.querySelector('.weather-setup__range');

    expect(saveButton?.textContent).toContain('Save and Update Readings');
    expect(stationSelector.compareDocumentPosition(dateRange) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text).toContain('Predictors');
    expect(text).not.toContain('Calculated values');
    expect(text).not.toContain('Included predictors');
    expect(text).not.toContain('Generate preview');
    expect(text).not.toContain('Manage included weather predictors');
  });

  it('deletes an existing station group through the reviewed atomic workflow', async () => {
    const group = {
      routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
      predictors: [{ guid: 'weather-a', name: 'HDD', weatherDataType: 'HDD', heatingBaseTemperature: 60, production: false }]
    };
    const preview = {
      workspaceRevision: 1, station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      addPredictors: [], updatePredictors: [], deletePredictors: group.predictors,
      addReadings: [], updateReadings: [], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    const previewStationGroup = vi.fn(async () => preview);
    const commitStationGroup = vi.fn(async () => undefined);
    const fixture = createFixture({ group, creating: false, previewStationGroup, commitStationGroup });

    expect(fixture.nativeElement.textContent).toContain('Delete weather station');
    await fixture.componentInstance.confirmDeleteStation();

    expect(previewStationGroup).toHaveBeenCalledWith(
      expect.objectContaining({ sourceGroupKey: group.routeKey, definitions: [] }), group.predictors, []
    );
    expect(commitStationGroup).toHaveBeenCalledWith(preview);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/predictors']);
  });

  it('derives units and preserves a custom name when the type changes', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const definition = component.definitions()[0];
    component.setDefinitionName(definition.draftId, 'My baseline');
    component.setDefinitionType(definition.draftId, 'relativeHumidity');

    expect(component.definitions()[0]).toEqual(expect.objectContaining({
      name: 'My baseline', weatherDataType: 'relativeHumidity', baseTemperature: undefined, unit: '%', production: false
    }));
    expect(fixture.nativeElement.textContent).not.toContain('Classification');
  });

  it('renders and updates the selected weather type for each predictor row', () => {
    const group = {
      routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
      predictors: [{
        guid: 'weather-cdd', name: 'CDD Generated (60F)', weatherDataType: 'CDD',
        coolingBaseTemperature: 60, production: false
      }]
    };
    const fixture = createFixture({ group, creating: false });
    const select = fixture.nativeElement.querySelector('.weather-setup__definition select') as HTMLSelectElement;

    expect(select.value).toBe('CDD');
    expect(select.selectedOptions[0].textContent).toContain('Cooling degree days');

    select.value = 'relativeHumidity';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.definitions()[0].weatherDataType).toBe('relativeHumidity');
    expect(select.value).toBe('relativeHumidity');
    expect(select.selectedOptions[0].textContent).toContain('Relative humidity');
  });
});

function createFixture(options: { group?: any; creating?: boolean; previewStationGroup?: any; commitStationGroup?: any } = {}) {
  const state = signal({ status: 'idle', message: '' });
  TestBed.configureTestingModule({
    imports: [WeatherPredictorSetupComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        selectedWeatherGroup: signal(options.group), creatingWeatherGroup: signal(options.creating ?? true),
        defaultWeatherRange: signal({ start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } }),
        facility: signal({ guid: 'facility-a', city: 'Oak Ridge', state: 'TN' }), predictorReadings: signal([]),
        canWrite: signal(true), hasPending: signal(false)
      } },
      { provide: PredictorWeatherWorkflowService, useValue: {
        state, busy: signal(false), reset: vi.fn(), previewStationGroup: options.previewStationGroup ?? vi.fn(),
        commitStationGroup: options.commitStationGroup ?? vi.fn()
      } },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()), confirmDiscard: vi.fn(() => true) } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: WorkspaceNavigationService, useValue: { facilityDataRoute: vi.fn(() => ['/predictors']), facilityWeatherPredictorRoute: vi.fn(() => ['/weather']) } },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: WeatherStationLookupService, useValue: { getStation: vi.fn(), searchLocations: vi.fn(), findStations: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(WeatherPredictorSetupComponent);
  fixture.detectChanges();
  return fixture;
}
