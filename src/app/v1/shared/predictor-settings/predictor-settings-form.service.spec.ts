import { TestBed } from '@angular/core/testing';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { normalizeStandardPredictorSettings } from '@app/v1/data/predictors/models/standard-predictor-settings.models';
import { PredictorSettingsFormService } from './predictor-settings-form.service';

describe('PredictorSettingsFormService', () => {
  const service = TestBed.inject(PredictorSettingsFormService);

  it('keeps the shared standard editor free of unreachable weather controls', () => {
    const form = service.build(predictor());
    expect(Object.keys(form.controls)).toEqual([
      'name', 'unit', 'description', 'production', 'noLongerInUse', 'stopMonth', 'canBeNegative', 'ignoreDateStatusChecks'
    ]);
    expect(form.valid).toBe(true);
  });

  it('preserves unrelated fields and normalizes empty optional text and disabled controls', () => {
    const source = predictor({ referencePredictorId: 'unchanged', noLongerInUse: true });
    const form = service.build(source);
    form.patchValue({ name: ' Edited ', unit: ' ', description: ' ', stopMonth: '2026-03', production: false });
    form.disable({ emitEvent: false });
    expect(service.updatePredictor(source, form)).toMatchObject({ name: 'Edited', unit: undefined, description: undefined,
      production: false, noLongerInUseYear: 2026, noLongerInUseMonth: 2, referencePredictorId: 'unchanged' });
    expect(source.name).toBe('Production');
  });

  it('hydrates silently and rejects an invalid stop month only while inactive', () => {
    const form = service.build(predictor({ noLongerInUse: true }));
    const changes = vi.fn();
    form.valueChanges.subscribe(changes);
    service.hydrate(form, { ...form.getRawValue(), stopMonth: '2026-13' });
    expect(changes).not.toHaveBeenCalled();
    expect(form.hasError('invalidStopMonth')).toBe(true);
    form.controls.noLongerInUse.setValue(false);
    expect(form.valid).toBe(true);
    expect(service.updatePredictor(predictor(), form).noLongerInUseMonth).toBeUndefined();
  });

  it('maps production and a stop month to the persisted predictor fields', () => {
    const value = predictor({ noLongerInUse: true });
    const form = service.build(value);
    form.controls.production.setValue(false);
    form.controls.stopMonth.setValue('2026-03');
    const updated = service.updatePredictor(value, form);
    expect(updated).toMatchObject({
      production: false,
      noLongerInUseYear: 2026,
      noLongerInUseMonth: 2
    });
  });

  it.each(['reset', 'reconcile'] as const)('hydrates %s text silently while keeping persistence normalized', mode => {
    const form = service.build(predictor());
    form.patchValue({ name: ' Name ', unit: ' kg ', description: ' Note ' });
    const changes = vi.fn(); form.valueChanges.subscribe(changes);

    service.hydrate(form, normalizeStandardPredictorSettings(form.getRawValue()), mode);

    expect(form.getRawValue()).toMatchObject(mode === 'reconcile'
      ? { name: ' Name ', unit: ' kg ', description: ' Note ' }
      : { name: 'Name', unit: 'kg', description: 'Note' });
    expect(changes).not.toHaveBeenCalled();
    expect(service.updatePredictor(predictor(), form)).toMatchObject({ name: 'Name', unit: 'kg', description: 'Note' });
  });
});

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    description: '', importWizardName: '', production: true, productionInAnalysis: true, regressionCoefficient: 0,
    predictorType: 'Standard', referencePredictorId: '', conversionType: '', convertFrom: '', convertTo: '',
    weatherDataType: 'HDD', weatherStationId: '', weatherStationName: '', heatingBaseTemperature: undefined,
    coolingBaseTemperature: undefined, weatherDataWarning: false, ...overrides
  } as IdbPredictor;
}
