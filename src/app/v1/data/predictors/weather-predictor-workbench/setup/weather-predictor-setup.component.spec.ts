import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WEATHER_DATA_TYPE_OPTIONS, defaultWeatherPredictorName, weatherLastTwoYearsRange, weatherPredictorUnit } from '../../models';
import { createWeatherSetupFixture as createFixture, savedWeatherSetupGroup } from './weather-predictor-setup.testing';
import { WeatherStationSelectorComponent } from '../../shared/weather-station-selector/weather-station-selector.component';

describe('WeatherPredictorSetupComponent', () => {
  it('seeds checked types, opens station selection once, and preserves edits through publications', () => {
    const revision = signal(1);
    const fixture = createFixture({ creationTypes: ['CDD', 'relativeHumidity'], autoOpenStation: true, revisionSignal: revision });
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.definitions().map(definition => definition.weatherDataType)).toEqual(['CDD', 'relativeHumidity']);
    expect(component.definitions().map(definition => definition.baseTemperature)).toEqual([60, undefined]);
    const selector = fixture.debugElement.query(By.directive(WeatherStationSelectorComponent)).componentInstance as WeatherStationSelectorComponent;
    expect(selector.selectorOpen()).toBe(true);
    selector.closeSelector(); fixture.detectChanges();
    component.setDefinitionName(component.definitions()[0].draftId, 'My cooling history');
    revision.set(2); fixture.detectChanges();
    expect(selector.selectorOpen()).toBe(false);
    expect(component.definitions()[0].name).toBe('My cooling history');
    expect(component.definitions().map(definition => definition.weatherDataType)).toEqual(['CDD', 'relativeHumidity']);
    const workflow = TestBed.inject(PredictorWeatherWorkflowService);
    expect(workflow.previewStationGroup).not.toHaveBeenCalled();
    expect(workflow.previewStationSelection).not.toHaveBeenCalled();
    expect(workflow.commitStationGroup).not.toHaveBeenCalled();
  });

  it('uses the same typed form validators for field errors and submission readiness', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.selectStation({ ID: 'station-a', name: 'Station A' } as any); fixture.detectChanges();
    const row = component.form.controls.definitions.at(0);
    expect(component.form.valid).toBe(true); expect(component.canSubmit()).toBe(true);
    row.controls.name.setValue('   '); fixture.detectChanges();
    expect(row.controls.name.hasError('required')).toBe(true);
    expect(component.form.invalid).toBe(true); expect(component.canSubmit()).toBe(false);
    expect(fixture.nativeElement.querySelector('input[type="text"]').getAttribute('aria-invalid')).toBe('true');
    row.controls.name.setValue('Cooling history'); row.controls.baseTemperature.setValue(null); fixture.detectChanges();
    expect(row.hasError('weatherBaseRequired')).toBe(true);
    expect(component.form.invalid).toBe(true); expect(component.canSubmit()).toBe(false);
    row.controls.weatherDataType.setValue('relativeHumidity'); fixture.detectChanges();
    expect(row.hasError('weatherBaseRequired')).toBe(false);
    expect(component.form.valid).toBe(true); expect(component.canSubmit()).toBe(true);
    component.form.controls.endMonth.setValue('2025-01'); fixture.detectChanges();
    expect(component.form.hasError('weatherRange')).toBe(true);
    expect(component.form.invalid).toBe(true); expect(component.canSubmit()).toBe(false);
    component.form.controls.endMonth.setValue('2026-03'); fixture.detectChanges();
    expect(component.form.valid).toBe(true); expect(component.canSubmit()).toBe(true);
    component.removeDefinition(component.definitions()[0].draftId); fixture.detectChanges();
    expect(component.form.controls.definitions.hasError('required')).toBe(true);
    expect(component.form.invalid).toBe(true); expect(component.canSubmit()).toBe(false);
  });

  it('observes pristine changes without republishing values or scheduling weather work', () => {
    const fixture = createFixture({ creating: false, group: savedWeatherSetupGroup(['CDD']) });
    const component = fixture.componentInstance;
    const workflow = TestBed.inject(PredictorWeatherWorkflowService);
    const changed = vi.fn(); component.form.valueChanges.subscribe(changed);
    vi.mocked(workflow.reset).mockClear();
    const value = component.form.getRawValue();
    component.form.markAsDirty(); expect(component.dirty()).toBe(true);
    component.form.markAsPristine(); expect(component.dirty()).toBe(false);
    component.form.markAsDirty(); expect(component.dirty()).toBe(true);
    expect(component.form.getRawValue()).toEqual(value); expect(changed).not.toHaveBeenCalled();
    expect(workflow.reset).not.toHaveBeenCalled(); expect(workflow.previewStationGroup).not.toHaveBeenCalled();
    expect(workflow.commitStationGroup).not.toHaveBeenCalled();
  });

  it('restores pristine submission readiness after silent permission disable and enable', () => {
    const fixture = createFixture({ creating: false, group: savedWeatherSetupGroup(['CDD']) });
    const component = fixture.componentInstance;
    const canWrite = TestBed.inject(FacilityPredictorsWorkspaceService).canWrite as WritableSignal<boolean>;
    const changed = vi.fn(); component.form.valueChanges.subscribe(changed);
    canWrite.set(false); fixture.detectChanges();
    expect(component.form.disabled).toBe(true); expect(component.canSubmit()).toBe(false);
    canWrite.set(true); component.canSubmit(); fixture.detectChanges();
    expect(component.form.valid).toBe(true); expect(component.canSubmit()).toBe(true);
    expect(component.dirty()).toBe(false); expect(changed).not.toHaveBeenCalled();
  });

  it('keeps the saved-station fallback range valid when no stored dates or meter defaults exist', () => {
    const fixture = createFixture({ creating: false, group: savedWeatherSetupGroup(['CDD']), defaultRange: undefined });
    expect(fixture.componentInstance.stationPreviewRange()).toEqual(weatherLastTwoYearsRange());
    expect(fixture.componentInstance.form.valid).toBe(true); expect(fixture.componentInstance.canSubmit()).toBe(true);
  });

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

  it('disables setup editing without write permission and ignores attempted changes', () => {
    const fixture = createFixture({ canWrite: false });
    const component = fixture.componentInstance;
    const initialStart = component.startMonth();
    const initialDefinitions = component.definitions();

    expect(component.canEdit()).toBe(false);
    expect(component.canSubmit()).toBe(false);
    expect(fixture.debugElement.query(By.directive(WeatherStationSelectorComponent)).componentInstance.disabled).toBe(true);
    expect(Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
      '.weather-setup input, .weather-setup select, .weather-setup button'
    )).every(control => control.disabled)).toBe(true);

    component.setStartMonth('2025-01');
    component.addDefinition();

    expect(component.startMonth()).toBe(initialStart);
    expect(component.definitions()).toEqual(initialDefinitions);
    expect(component.dirty()).toBe(false);
  });

  it('disables setup submission and editing while a workspace command is pending', () => {
    const fixture = createFixture({
      creating: false,
      hasPending: true,
      group: {
        routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
        predictors: [{
          guid: 'weather-a', name: 'HDD', weatherDataType: 'HDD',
          heatingBaseTemperature: 60, production: false
        }]
      }
    });

    expect(fixture.componentInstance.canEdit()).toBe(false);
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    expect((fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.weather-setup__top-actions button')?.disabled).toBe(true);
  });

  it('uses the last two years when a station is chosen before dates are entered', () => {
    const fixture = createFixture({ defaultRange: undefined });
    const component = fixture.componentInstance;
    const expectedRange = weatherLastTwoYearsRange();

    expect(component.startMonth()).toBe('');
    expect(component.endMonth()).toBe('');
    expect(component.stationPreviewRange()).toEqual(expectedRange);

    component.selectStation({ ID: 'station-a', name: 'Station A' } as any);

    expect(component.startMonth()).toBe(monthInput(expectedRange.start));
    expect(component.endMonth()).toBe(monthInput(expectedRange.end));
  });

  it('does not replace a partially entered station-preview range', () => {
    const fixture = createFixture({ defaultRange: undefined });
    const component = fixture.componentInstance;
    component.setStartMonth('2025-01');

    expect(component.stationPreviewRange()).toBeUndefined();
  });

  it('removes the date range from saved station setup', () => {
    const savedFixture = createFixture({
      creating: false,
      group: {
        routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
        predictors: [{ guid: 'weather-a', name: 'HDD', weatherDataType: 'HDD', heatingBaseTemperature: 60 }]
      }
    });
    expect(savedFixture.nativeElement.querySelector('.weather-setup__range')).toBeNull();
    expect(savedFixture.nativeElement.textContent).not.toContain('Start month');
    expect(savedFixture.nativeElement.textContent).not.toContain('End month');
  });

  it('allows an unchanged saved setup to check for reading updates', async () => {
    const group = {
      routeKey: 'station:station-a', stationId: 'station-a', stationName: 'Station A',
      predictors: [{
        guid: 'weather-a', name: 'HDD', weatherDataType: 'HDD',
        heatingBaseTemperature: 60, production: false
      }]
    };
    const preview = {
      workspaceRevision: 1, station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      addPredictors: [], updatePredictors: group.predictors, deletePredictors: [],
      addReadings: [], updateReadings: [], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    const previewStationGroup = vi.fn(async () => preview);
    const fixture = createFixture({ group, creating: false, previewStationGroup });
    const component = fixture.componentInstance;
    const saveButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.weather-setup__top-actions button')!;

    expect(component.dirty()).toBe(false);
    expect(component.canSubmit()).toBe(true);
    expect(saveButton.disabled).toBe(false);

    await component.saveAndUpdateReadings();

    expect(previewStationGroup).toHaveBeenCalledWith(
      expect.objectContaining({ sourceGroupKey: group.routeKey }), group.predictors, []
    );
    expect(component.preview()).toBe(preview);
  });

  it('allows a future end month and explains that future readings will be zero', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    component.selectStation({ ID: 'station-a', name: 'Station A' } as any);
    component.setStartMonth(relativeMonthInput(0));
    component.setEndMonth(relativeMonthInput(2));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(component.canSubmit()).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('.weather-setup__top-actions button')?.disabled).toBe(false);
    expect(root.textContent).toContain("We can't predict the future");
    expect(root.textContent).toContain('future months will be saved as 0');
    expect(root.textContent).toContain('Use Save and Update Readings later');
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
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', 'predictors'], { queryParams: { facility: 'facility-a' } });
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

  it.each(WEATHER_DATA_TYPE_OPTIONS)('renders the saved $label in its native selector', async ({ value, label }) => {
    const group = savedWeatherSetupGroup([value]);
    const fixture = createFixture({ group, creating: false });
    await fixture.whenStable();
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const workflow = TestBed.inject(PredictorWeatherWorkflowService);

    expect(select.value).toBe(value);
    expect(select.selectedOptions[0].textContent?.trim()).toBe(label);
    expect(fixture.componentInstance.form.pristine).toBe(true);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    expect(workflow.previewStationGroup).not.toHaveBeenCalled();
    expect(workflow.previewStationSelection).not.toHaveBeenCalled();
    expect(workflow.commitStationGroup).not.toHaveBeenCalled();

    const name = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    name.value = 'Custom weather predictor';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(select.value).toBe(value);
    expect(fixture.componentInstance.definitions()[0]).toEqual(expect.objectContaining({
      name: 'Custom weather predictor', weatherDataType: value, predictorGuid: 'weather-0', production: true
    }));
    expect(workflow.previewStationGroup).not.toHaveBeenCalled();
  });

  it('silently hydrates a delayed mixed saved group and keeps added and remaining rows selected', () => {
    const groupSignal = signal<any>(undefined);
    const fixture = createFixture({ creating: false, groupSignal });
    const valueChanged = vi.fn();
    fixture.componentInstance.form.valueChanges.subscribe(valueChanged);
    groupSignal.set(savedWeatherSetupGroup(['CDD', 'relativeHumidity', 'precipitation']));
    fixture.detectChanges();

    const selections = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select')).map(select => select.value);
    expect(selections()).toEqual(['CDD', 'relativeHumidity', 'precipitation']);
    expect(valueChanged).not.toHaveBeenCalled();
    expect(fixture.componentInstance.dirty()).toBe(false);

    fixture.componentInstance.addDefinition('wetBulbTemp');
    fixture.detectChanges();
    expect(selections()).toEqual(['CDD', 'relativeHumidity', 'precipitation', 'wetBulbTemp']);
    fixture.componentInstance.removeDefinition(fixture.componentInstance.definitions()[1].draftId);
    fixture.detectChanges();
    expect(selections()).toEqual(['CDD', 'precipitation', 'wetBulbTemp']);
    expect(fixture.componentInstance.definitions().map(definition => definition.predictorGuid))
      .toEqual(['weather-0', 'weather-2', undefined]);
  });

  it('applies type and base defaults once for real edits while preserving custom names and saved identity', async () => {
    const previewStationGroup = vi.fn(async () => undefined);
    const fixture = createFixture({
      creating: false, group: savedWeatherSetupGroup(['HDD']), previewStationGroup
    });
    const component = fixture.componentInstance;
    const workflow = TestBed.inject(PredictorWeatherWorkflowService);
    vi.mocked(workflow.reset).mockClear();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'CDD';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(component.definitions()[0]).toEqual(expect.objectContaining({
      predictorGuid: 'weather-0', weatherDataType: 'CDD', baseTemperature: 60,
      name: defaultWeatherPredictorName('CDD', 60), unit: weatherPredictorUnit('CDD'), production: true
    }));
    expect(workflow.reset).toHaveBeenCalledTimes(1);
    const base = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    base.value = '';
    base.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.canSubmit()).toBe(false);
    expect(base.getAttribute('aria-invalid')).toBe('true');
    component.setDefinitionName(component.definitions()[0].draftId, 'Custom cooling');
    select.value = 'relativeHumidity';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(component.definitions()[0]).toEqual(expect.objectContaining({
      name: 'Custom cooling', weatherDataType: 'relativeHumidity', baseTemperature: undefined, unit: '%'
    }));
    expect(fixture.nativeElement.querySelector('input[type="number"]')).toBeNull();
    expect(component.canSubmit()).toBe(true);
    expect(previewStationGroup).not.toHaveBeenCalled();
    await component.saveAndUpdateReadings();
    expect(previewStationGroup).toHaveBeenCalledWith(expect.objectContaining({
      definitions: [expect.objectContaining({ predictorGuid: 'weather-0', production: true, weatherDataType: 'relativeHumidity' })]
    }), expect.any(Array), []);
  });

  it('deduplicates unchanged control values and accepts the same edit after discard', () => {
    const fixture = createFixture({ creating: false, group: savedWeatherSetupGroup(['CDD']) });
    const component = fixture.componentInstance;
    const workflow = TestBed.inject(PredictorWeatherWorkflowService);
    vi.mocked(workflow.reset).mockClear();
    const rename = () => component.setDefinitionName(component.definitions()[0].draftId, 'A custom name');
    rename();
    rename();
    expect(workflow.reset).toHaveBeenCalledTimes(1);
    component.discardChanges();
    expect(component.dirty()).toBe(false);
    rename();
    expect(component.dirty()).toBe(true);
    expect(component.definitions()[0].name).toBe('A custom name');
  });

  it('merges independent saved definition changes and additions without replacing the edited control', () => {
    const group = savedWeatherSetupGroup(['CDD']);
    const groupSignal = signal<any>(group);
    const fixture = createFixture({ creating: false, groupSignal });
    const component = fixture.componentInstance;
    const row = component.form.controls.definitions.at(0);
    component.setDefinitionName(component.definitions()[0].draftId, 'My cooling history');
    const added = savedWeatherSetupGroup(['CDD', 'relativeHumidity']).predictors[1];
    groupSignal.set({ ...group, predictors: [{ ...group.predictors[0], production: false }, added] });
    fixture.detectChanges();

    expect(component.form.controls.definitions.at(0)).toBe(row);
    expect(component.definitions()).toEqual([
      expect.objectContaining({ name: 'My cooling history', production: false, predictorGuid: 'weather-0' }),
      expect.objectContaining({ weatherDataType: 'relativeHumidity', predictorGuid: 'weather-1' })
    ]);
    expect(component.conflicts()).toHaveLength(0);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('keeps an unchanged reordered projection pristine with the same row controls', () => {
    const group = savedWeatherSetupGroup(['CDD', 'relativeHumidity']);
    const groupSignal = signal<any>(group);
    const fixture = createFixture({ creating: false, groupSignal });
    const controls = [...fixture.componentInstance.form.controls.definitions.controls];
    groupSignal.set({ ...group, predictors: [...group.predictors].reverse() }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.definitions.controls).toEqual(controls);
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('reviews coupled type/base/name conflicts and does not recreate an externally removed predictor', () => {
    const group = savedWeatherSetupGroup(['CDD', 'relativeHumidity']);
    const groupSignal = signal<any>(group);
    const fixture = createFixture({ creating: false, groupSignal });
    const component = fixture.componentInstance;
    component.setDefinitionName(component.definitions()[0].draftId, 'My cooling history');
    groupSignal.set({ ...group, predictors: [{ ...group.predictors[0], coolingBaseTemperature: 70 }, group.predictors[1]] });
    fixture.detectChanges();
    expect(component.conflicts()).toHaveLength(1);
    expect(component.canSubmit()).toBe(false);
    component.resolveConflicts({ [component.conflicts()[0].id]: 'local' });
    fixture.detectChanges();
    expect(component.definitions()[0]).toEqual(expect.objectContaining({ name: 'My cooling history', baseTemperature: 65 }));
    groupSignal.set({ ...group, predictors: [group.predictors[1]] });
    fixture.detectChanges();
    expect(component.conflicts()).toHaveLength(1);
    component.resolveConflicts({ [component.conflicts()[0].id]: 'local' });
    fixture.detectChanges();
    expect(component.removedPredictors()).toHaveLength(1);
    expect(component.canSubmit()).toBe(false);
    const retained = component.definitions().find(definition => definition.predictorGuid === 'weather-0')!;
    expect(retained.name).toBe('My cooling history');
    component.removeDefinition(retained.draftId);
    fixture.detectChanges();
    expect(component.removedPredictors()).toHaveLength(0);
    expect(component.canSubmit()).toBe(true);
  });

  it('advances independent saved row fields across repeated publications while retaining the original conflict', () => {
    const group = savedWeatherSetupGroup(['CDD', 'relativeHumidity']);
    const groupSignal = signal<any>(group);
    const fixture = createFixture({ creating: false, groupSignal });
    const component = fixture.componentInstance;
    component.setDefinitionName(component.definitions()[0].draftId, 'My cooling history');
    const conflicting = { ...group.predictors[0], coolingBaseTemperature: 70 };
    groupSignal.set({ ...group, predictors: [conflicting, { ...group.predictors[1], name: 'First saved humidity' }] });
    fixture.detectChanges();
    expect(component.conflicts()).toHaveLength(1);
    groupSignal.set({ ...group, predictors: [conflicting, { ...group.predictors[1], name: 'Second saved humidity' }] });
    fixture.detectChanges();
    expect(component.conflicts()).toHaveLength(1);
    expect(component.definitions()[1].name).toBe('Second saved humidity');
    component.resolveConflicts({ [component.conflicts()[0].id]: 'local' });
    expect(component.definitions()[0].name).toBe('My cooling history');
    expect(component.definitions()[1].name).toBe('Second saved humidity');
  });

  it('resets accepted facility changes even when both facilities use the same station key', () => {
    const facilitySignal = signal<any>({ guid: 'facility-a' });
    const groupSignal = signal<any>(savedWeatherSetupGroup(['CDD']));
    const fixture = createFixture({ creating: false, facilitySignal, groupSignal });
    const component = fixture.componentInstance;
    component.setDefinitionName(component.definitions()[0].draftId, 'Facility A draft');
    facilitySignal.set({ guid: 'facility-b' });
    groupSignal.set({ ...savedWeatherSetupGroup(['relativeHumidity']) });
    fixture.detectChanges();
    expect(component.definitions()[0].weatherDataType).toBe('relativeHumidity');
    expect(component.definitions()[0].name).not.toBe('Facility A draft');
    expect(component.dirty()).toBe(false);
  });

  it('ignores an outdated reading preview while retaining the local setup draft', async () => {
    let resolve!: (value: any) => void;
    const revisionSignal = signal(1);
    const fixture = createFixture({ creating: false, group: savedWeatherSetupGroup(['CDD']), revisionSignal,
      previewStationGroup: vi.fn(() => new Promise(value => { resolve = value; })) });
    const component = fixture.componentInstance;
    component.setDefinitionName(component.definitions()[0].draftId, 'My cooling history');
    const preparing = component.saveAndUpdateReadings();
    revisionSignal.set(2); fixture.detectChanges();
    resolve({ workspaceRevision: 1 });
    await preparing;
    expect(component.preview()).toBeUndefined();
    expect(component.dirty()).toBe(true);
    expect(component.definitions()[0].name).toBe('My cooling history');
  });

  it('acknowledges newly assigned predictor GUIDs from its own committed publication without duplicate draft rows', async () => {
    const group = savedWeatherSetupGroup(['CDD']);
    const added = { ...savedWeatherSetupGroup(['relativeHumidity']).predictors[0], guid: 'saved-humidity' };
    const groupSignal = signal<any>(group), revisionSignal = signal(1);
    const preview = {
      workspaceRevision: 1, station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      addPredictors: [added], updatePredictors: group.predictors, deletePredictors: [],
      addReadings: [], updateReadings: [], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    let fixture!: ReturnType<typeof createFixture>;
    fixture = createFixture({ creating: false, group, groupSignal, revisionSignal,
      previewStationGroup: vi.fn(async () => preview), commitStationGroup: vi.fn(async () => {
        groupSignal.set({ ...group, predictors: [...group.predictors, added] }); revisionSignal.set(2); fixture.detectChanges();
      }) });
    const component = fixture.componentInstance; component.addDefinition('relativeHumidity');
    await component.saveAndUpdateReadings(); await component.confirmSaveAndUpdateReadings(); fixture.detectChanges();
    expect(component.definitions()).toHaveLength(2);
    expect(component.definitions().map(definition => definition.predictorGuid)).toEqual(['weather-0', 'saved-humidity']);
    expect(component.dirty()).toBe(false); expect(component.saveCompleted()).toBe(true); expect(component.preview()).toBe(preview);
  });

  it('retains the reviewed completion when its final saved predictor is removed by its own commit', async () => {
    const group = savedWeatherSetupGroup(['CDD']);
    const groupSignal = signal<any>(group), revisionSignal = signal(1);
    const preview = {
      workspaceRevision: 1, station: { ID: 'station-a', name: 'Station A' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      addPredictors: [], updatePredictors: [], deletePredictors: group.predictors,
      addReadings: [], updateReadings: [], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    };
    let fixture!: ReturnType<typeof createFixture>;
    fixture = createFixture({ creating: false, group, groupSignal, revisionSignal,
      previewStationGroup: vi.fn(async () => preview), commitStationGroup: vi.fn(async () => {
        groupSignal.set(undefined); revisionSignal.set(2); fixture.detectChanges();
      }) });
    const component = fixture.componentInstance; component.removeDefinition(component.definitions()[0].draftId);
    await component.saveAndUpdateReadings(); await component.confirmSaveAndUpdateReadings(); fixture.detectChanges();
    expect(component.saveCompleted()).toBe(true); expect(component.preview()).toBe(preview); expect(component.dirty()).toBe(false);
    component.closeSaveProcess();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalled();
  });

  it('clears old-owner pending presentation before ignoring a late preview', async () => {
    let complete!: (preview: any) => void;
    const facilitySignal = signal<any>({ guid: 'facility-a' });
    const fixture = createFixture({ creating: false, group: savedWeatherSetupGroup(['CDD']), facilitySignal,
      previewStationGroup: vi.fn(() => new Promise(resolve => { complete = resolve; })) });
    const component = fixture.componentInstance; const pending = component.saveAndUpdateReadings();
    expect(component.committing()).toBe(true);
    facilitySignal.set({ guid: 'facility-b' }); fixture.detectChanges();
    expect(component.committing()).toBe(false); expect(component.canEdit()).toBe(true);
    complete({ workspaceRevision: 1 }); await pending;
    expect(component.preview()).toBeUndefined(); expect(component.canEdit()).toBe(true);
  });
});


function relativeMonthInput(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthInput(month: { year: number; month: number }): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}
