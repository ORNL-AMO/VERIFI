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
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { PredictorWorkbenchContextService } from '../predictor-workbench-context.service';
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

  it('renders Is Production as a checkbox and immediately saves its boolean value', async () => {
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor, readings: [{ guid: 'reading-a' }] });
    const element = fixture.nativeElement as HTMLElement;
    const checkbox = element.querySelector<HTMLInputElement>('input[formControlName="production"]')!;
    const fieldLabels = Array.from(element.querySelectorAll('label > span')).map(label => label.textContent?.trim());

    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(true);
    expect(checkbox.parentElement?.textContent).toContain('Is Production?');
    expect(fieldLabels).not.toContain('Type');
    expect(element.textContent).not.toContain('Predictor identity');
    expect(element.textContent).not.toContain('Readings exist for this predictor.');

    checkbox.click();
    await fixture.whenStable();

    expect(updatePredictor).toHaveBeenCalledWith(expect.objectContaining({ production: false }));
  });

  it('toggles no longer in use from the footer and saves the predictor', async () => {
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const button = fixture.nativeElement.querySelector('.v1-btn--deactivate') as HTMLButtonElement;

    expect(button.textContent).toContain('Mark no longer in use');
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updatePredictor).toHaveBeenCalledWith(expect.objectContaining({ noLongerInUse: true }));
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('Return predictor to use');
  });

});

function createFixture(options: { updatePredictor?: any; readings?: any[]; predictor?: any } = {}) {
  const selectedPredictor = signal(options.predictor ?? predictor());
  const selectedReadings = signal(options.readings ?? []);
  TestBed.configureTestingModule({
    imports: [PredictorWorkbenchSettingsComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
        canWrite: signal(true), hasPending: signal(false)
      } },
      {
        provide: PredictorWorkbenchContextService,
        useValue: { predictor: selectedPredictor, readings: selectedReadings, card: signal(undefined) }
      },
      { provide: PredictorWorkspaceActionsService, useValue: {
        updatePredictor: options.updatePredictor ?? vi.fn(async (value: any) => value), deletePredictor: vi.fn()
      } },
      { provide: PredictorWeatherWorkflowService, useValue: {
        state: signal({ status: 'idle', message: '' }), busy: signal(false), reset: vi.fn(), cancel: vi.fn(),
        previewSettingsChange: vi.fn(async () => undefined), commitSettings: vi.fn()
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
