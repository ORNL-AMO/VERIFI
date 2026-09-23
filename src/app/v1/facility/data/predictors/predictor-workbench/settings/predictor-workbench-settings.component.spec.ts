import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorWorkbenchSettingsComponent } from './predictor-workbench-settings.component';

describe('PredictorWorkbenchSettingsComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('debounces text saves and clears dirty state after persistence', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const form = fixture.componentInstance.form()!;
    form.controls.name.setValue('Updated production');
    fixture.componentInstance.onTextChange();
    expect(updatePredictor).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(650);

    expect(updatePredictor).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated production' }));
    expect(form.pristine).toBe(true);
    expect(fixture.componentInstance.saveState()).toBe('saved');
  });

  it('locks weather-defining fields when readings exist', () => {
    const fixture = createFixture({
      readings: [{ guid: 'reading-a' }],
      predictor: predictor({ predictorType: 'Weather', weatherStationId: 'station-a', weatherStationName: 'Oak Ridge', heatingBaseTemperature: 60 })
    });
    const form = fixture.componentInstance.form()!;
    expect(form.controls.predictorType.disabled).toBe(true);
    expect(form.controls.weatherDataType.disabled).toBe(true);
    expect(form.controls.weatherStationId.disabled).toBe(true);
    expect(form.controls.name.enabled).toBe(true);
  });
});

function createFixture(options: { updatePredictor?: any; readings?: any[]; predictor?: any } = {}) {
  TestBed.configureTestingModule({
    imports: [PredictorWorkbenchSettingsComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        selectedPredictor: signal(options.predictor ?? predictor()), selectedReadings: signal(options.readings ?? []),
        selectedPredictorCard: signal(undefined), account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
        canWrite: signal(true), hasPending: signal(false)
      } },
      { provide: PredictorWorkspaceActionsService, useValue: {
        updatePredictor: options.updatePredictor ?? vi.fn(async (value: any) => value), deletePredictor: vi.fn()
      } },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()) } },
      { provide: WeatherStationLookupService, useValue: { getStation: vi.fn(async () => undefined), searchLocations: vi.fn(), findStations: vi.fn() } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: WorkspaceNavigationService, useValue: { facilityDataRoute: vi.fn(() => ['/predictors']) } },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(PredictorWorkbenchSettingsComponent);
  fixture.detectChanges();
  return fixture;
}

function predictor(overrides: Record<string, unknown> = {}): any {
  return {
    id: 1, guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    description: '', production: true, predictorType: 'Standard', weatherDataType: 'HDD', ...overrides
  };
}
