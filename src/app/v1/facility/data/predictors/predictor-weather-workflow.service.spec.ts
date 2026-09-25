import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HourlyWeatherDataService } from '@platform/weather/hourly-weather-data.service';
import { Observable, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';
import { PredictorWeatherWorkflowService } from './predictor-weather-workflow.service';

const actions = {
  createWeatherPredictors: vi.fn(async () => undefined),
  applyWeatherMaintenance: vi.fn(async () => undefined),
  applyWeatherSettings: vi.fn(async () => undefined),
  applyWeatherStationGroup: vi.fn(async () => undefined)
};

describe('PredictorWeatherWorkflowService', () => {

  beforeEach(() => vi.clearAllMocks());

  it('builds and commits a reviewed multi-type generation preview', async () => {
    const service = createService(of([hourlyReading()]));
    const preview = await service.previewGeneration({
      production: false,
      station: { ID: 'station-a', name: 'Oak Ridge' } as any,
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      definitions: [
        { weatherDataType: 'HDD', name: 'HDD', baseTemperature: 60 },
        { weatherDataType: 'relativeHumidity', name: 'Humidity' }
      ]
    });

    expect(preview?.predictors).toHaveLength(2);
    expect(preview?.readings).toHaveLength(2);
    expect(preview?.workspaceRevision).toBe(7);
    await service.commitGeneration(preview!);
    expect(actions.createWeatherPredictors).toHaveBeenCalledWith(preview);
    expect(service.state().status).toBe('idle');
  });

  it('cancels an in-flight weather request without producing a preview', async () => {
    const response = new Subject<any[]>();
    const service = createService(response);
    const result = service.previewGeneration({
      production: false,
      station: { ID: 'station-a', name: 'Oak Ridge' } as any,
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      definitions: [{ weatherDataType: 'HDD', name: 'HDD', baseTemperature: 60 }]
    });

    service.cancel();

    await expect(result).resolves.toBeUndefined();
    expect(service.state().status).toBe('cancelled');
  });

  it('loads a station selection preview without saving the station', async () => {
    const service = createService(of([hourlyReading()]));
    const preview = await service.previewStationSelection(
      { ID: 'station-a', name: 'Oak Ridge' } as any,
      { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      [{ weatherDataType: 'HDD', name: 'HDD 60', baseTemperature: 60 }]
    );

    expect(preview?.series).toEqual([
      expect.objectContaining({ name: 'HDD 60', unit: 'days', points: [expect.objectContaining({ warning: true })] })
    ]);
    expect(service.state().status).toBe('preview-ready');
    expect(actions.applyWeatherStationGroup).not.toHaveBeenCalled();
  });

  it('calculates a station month for each included predictor', async () => {
    const service = createService(of([hourlyReading()]));
    const values = await service.calculateStationMonth([{
      guid: 'hdd', name: 'HDD 60', predictorType: 'Weather', weatherDataType: 'HDD',
      weatherStationId: 'station-a', weatherStationName: 'Oak Ridge', heatingBaseTemperature: 60
    } as any], { year: 2026, month: 1 });

    expect(values).toEqual([
      expect.objectContaining({ predictorGuid: 'hdd', weatherDataWarning: true })
    ]);
    expect(service.state().status).toBe('preview-ready');
  });

  it('creates future zeroes without requesting unavailable hourly data', async () => {
    const service = createService(of([]));
    const hourlyWeather = TestBed.inject(HourlyWeatherDataService) as any;
    const future = relativeMonth(1);
    const preview = await service.previewGeneration({
      production: false,
      station: { ID: 'station-a', name: 'Oak Ridge' } as any,
      range: { start: future, end: future },
      definitions: [{ weatherDataType: 'HDD', name: 'HDD 60', baseTemperature: 60 }]
    });

    expect(hourlyWeather.load).not.toHaveBeenCalled();
    expect(preview?.readings).toEqual([
      expect.objectContaining({ amount: 0, weatherOverride: false, weatherDataWarning: false })
    ]);
  });

  it('rejects a station already owned by another weather workbench', async () => {
    const service = createService(of([hourlyReading()]), [{
      guid: 'existing', predictorType: 'Weather', weatherStationId: 'station-a'
    }]);
    const preview = await service.previewStationGroup({
      station: { ID: 'station-a', name: 'Oak Ridge' } as any,
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      definitions: [{ weatherDataType: 'HDD', name: 'HDD', baseTemperature: 60, production: false }]
    });

    expect(preview).toBeUndefined();
    expect(service.state().error).toContain('already has a workbench');
  });
});

function createService(response: Observable<any[]> | Subject<any[]>, predictors: any[] = []): PredictorWeatherWorkflowService {
  TestBed.configureTestingModule({ providers: [
    PredictorWeatherWorkflowService,
    { provide: AccountWorkspaceStore, useValue: {
      account: signal({ guid: 'account-a' }), selectedFacility: signal({ guid: 'facility-a' }), revision: signal(7),
      facilityPredictors: signal(predictors), facilityAnalyses: signal([])
    } },
    { provide: HourlyWeatherDataService, useValue: { load: vi.fn(() => response) } },
    { provide: PredictorWorkspaceActionsService, useValue: actions }
  ] });
  return TestBed.inject(PredictorWeatherWorkflowService);
}

function hourlyReading(): any {
  return {
    time: new Date(2026, 0, 1, 0), dry_bulb_temp: 50, humidity: 45,
    dew_point_temp: 40, wet_bulb_temp: 45, precipitation: 0
  };
}

function relativeMonth(offset: number): { year: number; month: number } {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
