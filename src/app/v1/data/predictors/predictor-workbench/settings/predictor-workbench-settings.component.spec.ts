import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { StandardPredictorActionsService } from '../../standard-predictor-actions.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { PredictorWorkbenchContextService } from '../predictor-workbench-context.service';
import { PredictorWorkbenchSettingsComponent } from './predictor-workbench-settings.component';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { applyStandardPredictorSettings, standardPredictorSettings } from '../../models/standard-predictor-settings.models';

describe('PredictorWorkbenchSettingsComponent', () => {
  afterEach(() => vi.useRealTimers());

  it.each([undefined, null, '', '  '])('edits a legacy predictor with no type (%s) and saves it explicitly as Standard', async type => {
    const updatePredictor = vi.fn(async (value: any) => value);
    const legacy = predictor({ predictorType: type });
    const fixture = createFixture({ predictor: legacy, updatePredictor });
    expect(fixture.componentInstance.supportedPredictor()).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('cannot be edited');
    const form = fixture.componentInstance.form()!;
    form.controls.name.setValue('Updated production'); form.markAsDirty();
    await fixture.componentInstance.saveNow();
    expect(updatePredictor).toHaveBeenCalledWith(expect.objectContaining({ guid: legacy.guid, name: 'Updated production', predictorType: 'Standard' }));
    expect(legacy.predictorType).toBe(type);
  });
  it.each(['Conversion', 'Math', 'Weather', 'Unknown'])('keeps explicit %s predictors out of the standard editor', type => {
    const fixture = createFixture({ predictor: predictor({ predictorType: type }) });
    expect(fixture.componentInstance.form()).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain(type + ' predictors are preserved');
  });

  it('debounces text saves and clears dirty state after persistence', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const form = fixture.componentInstance.form()!;
    form.controls.name.setValue('Updated production');
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

  it('refreshes pristine values silently and merges committed changes into a dirty draft', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const form = fixture.componentInstance.form()!;
    fixture.selectedPredictor.set({ ...fixture.selectedPredictor(), unit: 'kg' }); fixture.detectChanges();
    expect(fixture.componentInstance.form()).toBe(form);
    expect(form.controls.unit.value).toBe('kg');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    form.controls.name.setValue('Local production');
    fixture.selectedPredictor.set({ ...fixture.selectedPredictor(), description: 'Committed note' }); fixture.detectChanges();
    expect(form.getRawValue()).toMatchObject({ name: 'Local production', description: 'Committed note' });
    expect(fixture.componentInstance.editor.conflicts()).toEqual([]);
    expect(updatePredictor).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(650);
    expect(updatePredictor).toHaveBeenCalledWith(expect.objectContaining({ name: 'Local production', description: 'Committed note' }));
  });

  it('keeps later typing dirty until a serialized second save acknowledges it', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const first = new Promise<void>(resolve => { finish = resolve; });
    const updatePredictor = vi.fn().mockImplementationOnce(async (value: any) => { await first; return value; })
      .mockImplementation(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const form = fixture.componentInstance.form()!;
    form.controls.name.setValue('First change');
    await vi.advanceTimersByTimeAsync(650); fixture.detectChanges();
    expect(fixture.componentInstance.editor.saving()).toBe(true);
    expect(form.enabled).toBe(true);
    form.controls.name.setValue('Second change');
    await vi.advanceTimersByTimeAsync(650);
    expect(updatePredictor).toHaveBeenCalledTimes(1);
    finish(); await first; await vi.advanceTimersByTimeAsync(0); fixture.detectChanges();
    expect(updatePredictor).toHaveBeenCalledTimes(2);
    expect(updatePredictor.mock.calls[1][0].name).toBe('Second change');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('retains failures, retries them, and discards without a navigation-time write', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn().mockRejectedValueOnce(new Error('save failed'))
      .mockImplementation(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    fixture.componentInstance.form()!.controls.description.setValue('Draft note');
    await vi.advanceTimersByTimeAsync(650);
    expect(fixture.componentInstance.saveState()).toBe('error');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    await fixture.componentInstance.saveNow();
    expect(fixture.componentInstance.saveState()).toBe('saved');
    fixture.componentInstance.form()!.controls.name.setValue('Discard me');
    fixture.componentInstance.discardChanges();
    await vi.advanceTimersByTimeAsync(650);
    expect(updatePredictor).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.form()!.controls.name.value).toBe('Production');
    expect(fixture.componentInstance.form()!.controls.description.value).toBe('Draft note');
  });

  it.each(['name', 'unit', 'description'] as const)('preserves raw %s text typed during a save while persisting normalized values', async field => {
    vi.useFakeTimers();
    let finish!: () => void;
    const first = new Promise<void>(resolve => { finish = resolve; });
    const updatePredictor = vi.fn().mockImplementationOnce(async (value: any) => { await first; return value; })
      .mockImplementation(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const control = fixture.componentInstance.form()!.controls[field];
    control.setValue('First');
    await vi.advanceTimersByTimeAsync(650);
    control.setValue('First ');

    finish(); await first; await vi.advanceTimersByTimeAsync(0); fixture.detectChanges();

    expect(control.value).toBe('First ');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    await vi.advanceTimersByTimeAsync(650);
    expect(updatePredictor).toHaveBeenCalledOnce();
    expect(updatePredictor.mock.calls[0][0][field]).toBe('First');
    control.setValue(`${control.value}word`);
    await vi.advanceTimersByTimeAsync(650);
    expect(control.value).toBe('First word');
    expect(updatePredictor.mock.calls[1][0][field]).toBe('First word');
  });

  it('preserves raw local text through remote conflicts while applying changed saved fields and explicit saved choices', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    const form = fixture.componentInstance.form()!;
    form.patchValue({ name: 'Local ', unit: 'tons ', description: 'My note ' });

    fixture.selectedPredictor.set({ ...fixture.selectedPredictor(), unit: 'kg', description: 'Saved note' });
    fixture.detectChanges();

    expect(form.getRawValue()).toMatchObject({ name: 'Local ', unit: 'kg', description: 'My note ' });
    expect(fixture.componentInstance.editor.conflicts().map(conflict => conflict.id)).toEqual(['description']);
    fixture.componentInstance.resolveConflicts({ description: 'saved' });
    await vi.advanceTimersByTimeAsync(0); fixture.detectChanges();
    expect(form.getRawValue()).toMatchObject({ name: 'Local ', unit: 'kg', description: 'Saved note' });
    expect(updatePredictor).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Local', unit: 'kg', description: 'Saved note' }));
  });

  it('replaces raw text on explicit discard and resource identity changes', () => {
    const fixture = createFixture();
    const form = fixture.componentInstance.form()!;
    form.patchValue({ name: ' Production ', unit: ' tons ', description: ' ' });
    fixture.componentInstance.discardChanges();
    expect(form.getRawValue()).toMatchObject({ name: 'Production', unit: 'tons', description: '' });

    form.patchValue({ name: ' Production ', unit: ' tons ', description: ' ' });
    fixture.selectedPredictor.set(predictor({ guid: 'predictor-b' }));
    fixture.predictorGuid.set('predictor-b'); fixture.detectChanges();
    expect(fixture.componentInstance.form()!.getRawValue()).toMatchObject({ name: 'Production', unit: 'tons', description: '' });
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    expect(fixture.updateSettings).not.toHaveBeenCalled();
  });

  it('holds overlapping saved changes for an explicit choice', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    fixture.componentInstance.form()!.controls.name.setValue('Local name');
    fixture.selectedPredictor.set({ ...fixture.selectedPredictor(), name: 'Saved name' }); fixture.detectChanges();
    expect(fixture.componentInstance.saveState()).toBe('conflict');
    expect(fixture.componentInstance.editor.conflicts().map(conflict => conflict.id)).toEqual(['name']);
    await vi.advanceTimersByTimeAsync(650);
    expect(updatePredictor).not.toHaveBeenCalled();
    fixture.componentInstance.resolveConflicts({ name: 'saved' }); fixture.detectChanges();
    expect(fixture.componentInstance.form()!.controls.name.value).toBe('Saved name');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('retains a missing resource draft and blocks invalid settings', async () => {
    vi.useFakeTimers();
    const updatePredictor = vi.fn(async (value: any) => value);
    const fixture = createFixture({ updatePredictor });
    fixture.componentInstance.form()!.controls.name.setValue(' ');
    await vi.advanceTimersByTimeAsync(650);
    expect(updatePredictor).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saveState()).toBe('invalid');
    fixture.selectedPredictor.set(undefined); fixture.detectChanges();
    expect(fixture.componentInstance.form()!.controls.name.value).toBe(' ');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Your draft has been retained');
  });

});

function createFixture(options: { updatePredictor?: any; readings?: any[]; predictor?: any } = {}) {
  const selectedPredictor = signal(options.predictor ?? predictor());
  const selectedReadings = signal(options.readings ?? []);
  const predictorGuid = signal(selectedPredictor()?.guid ?? 'predictor-a');
  const pendingOperations = signal<readonly { ownerId?: string }[]>([]);
  const updateSettings = vi.fn(async (_identity: any, value: any, _base: any, ownerId: string) => {
    pendingOperations.set([{ ownerId }]);
    try {
      const updated = applyStandardPredictorSettings(selectedPredictor(), value);
      const saved = await (options.updatePredictor ?? (async (item: any) => item))(updated);
      selectedPredictor.set(saved);
      return standardPredictorSettings(saved);
    } finally { pendingOperations.set([]); }
  });
  TestBed.configureTestingModule({
    imports: [PredictorWorkbenchSettingsComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        account: signal({ guid: 'account-a' }), facility: signal({ guid: 'facility-a' }),
        canWrite: signal(true), hasPending: signal(false)
      } },
      {
        provide: PredictorWorkbenchContextService,
        useValue: { predictorGuid, predictor: selectedPredictor, readings: selectedReadings, card: signal(undefined) }
      },
      { provide: StandardPredictorActionsService, useValue: {
        updateSettings, deletePredictor: vi.fn()
      } },
      { provide: PredictorWeatherWorkflowService, useValue: {
        state: signal({ status: 'idle', message: '' }), busy: signal(false), reset: vi.fn(), cancel: vi.fn(),
        previewSettingsChange: vi.fn(async () => undefined), commitSettings: vi.fn()
      } },
      UnsavedChangesService,
      { provide: AccountWorkspaceStore, useValue: { pendingOperations } },
      { provide: WeatherStationLookupService, useValue: { getStation: vi.fn(async () => undefined), searchLocations: vi.fn(), findStations: vi.fn() } },
      { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
      { provide: WorkspaceNavigationService, useValue: { openFacilityInventory: (guid: string, resource: string) => TestBed.inject(Router).navigate(['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', resource], { queryParams: { facility: guid } }),
          facilityDataToolRoute: vi.fn(() => ['/predictors']) } },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(PredictorWorkbenchSettingsComponent);
  fixture.detectChanges();
  return Object.assign(fixture, { selectedPredictor, predictorGuid, pendingOperations, updateSettings });
}

function predictor(overrides: Record<string, unknown> = {}): any {
  return {
    id: 1, guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    description: '', production: true, predictorType: 'Standard', weatherDataType: 'HDD', ...overrides
  };
}
