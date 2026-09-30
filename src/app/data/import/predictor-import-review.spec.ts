import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  applyImportedWeatherReadingSemantics,
  getImportPredictorIssues,
  isImportPredictorValid,
  isSelectableExistingImportPredictor
} from './predictor-import-review';

describe('predictor import review', () => {
  it('validates standard names and unit lengths', () => {
    expect(isImportPredictorValid(predictor())).toBe(true);
    expect(getImportPredictorIssues(predictor({ name: '' }))).toContain('Enter a predictor name.');
    expect(isImportPredictorValid(predictor({ unit: 'u'.repeat(101) }))).toBe(false);
  });

  it('requires complete station and base-temperature settings for Weather matches', () => {
    const incomplete = predictor({ predictorType: 'Weather', weatherDataType: 'HDD' });
    expect(isSelectableExistingImportPredictor(incomplete)).toBe(false);

    const complete = predictor({
      predictorType: 'Weather', weatherDataType: 'HDD', weatherStationId: 'KORD',
      weatherStationName: 'Chicago O’Hare', heatingBaseTemperature: 60
    });
    expect(isSelectableExistingImportPredictor(complete)).toBe(true);
  });

  it('preserves imported Weather values as manual overrides', () => {
    const result = applyImportedWeatherReadingSemantics(reading(), predictor({ predictorType: 'Weather' }));
    expect(result).toMatchObject({ weatherOverride: true, weatherDataWarning: false, weatherDataChanged: false });
  });
});

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    description: '', importWizardName: 'Production', production: false, productionInAnalysis: false,
    predictorType: 'Standard', weatherDataType: 'HDD', weatherStationId: '', weatherStationName: '',
    ...overrides
  } as IdbPredictor;
}

function reading(): IdbPredictorData {
  return {
    guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    year: 2026, month: 1, amount: 12, weatherOverride: false, weatherDataWarning: true,
    weatherDataChanged: true
  } as IdbPredictorData;
}
