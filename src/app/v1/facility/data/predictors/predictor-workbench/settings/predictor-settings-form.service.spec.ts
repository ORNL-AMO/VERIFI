import { TestBed } from '@angular/core/testing';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { PredictorSettingsFormService } from './predictor-settings-form.service';

describe('PredictorSettingsFormService', () => {
  const service = TestBed.inject(PredictorSettingsFormService);

  it('requires station and applicable base temperature for weather predictors', () => {
    const form = service.build(predictor({ predictorType: 'Weather', weatherDataType: 'HDD' }));
    expect(form.errors).toMatchObject({ weatherStationRequired: true, heatingBaseRequired: true });

    form.controls.weatherStationId.setValue('station-a');
    form.controls.weatherStationName.setValue('Oak Ridge');
    form.controls.heatingBaseTemperature.setValue(60);
    form.updateValueAndValidity();
    expect(form.valid).toBe(true);
  });

  it('maps a stop month to the existing zero-based persisted month', () => {
    const value = predictor({ noLongerInUse: true });
    const form = service.build(value);
    form.controls.stopMonth.setValue('2026-03');
    const updated = service.updatePredictor(value, form);
    expect(updated).toMatchObject({ noLongerInUseYear: 2026, noLongerInUseMonth: 2 });
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
