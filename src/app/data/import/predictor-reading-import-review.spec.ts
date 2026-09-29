import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  buildImportPredictorReadingReview,
  getImportPredictorReadingIssues,
  isImportPredictorReadingValid
} from './predictor-reading-import-review';

describe('predictor reading import review', () => {
  const facility = { guid: 'facility-a', name: 'Main Plant' } as any;
  const predictor = makePredictor();

  it('classifies new, existing, and invalid readings before calculating ranges', () => {
    const current = reading({ guid: 'current', year: 2025, month: 2, amount: 10 });
    const rows = buildImportPredictorReadingReview({
      predictors: [predictor],
      readings: [
        reading({ guid: 'new', year: 2025, month: 1, amount: 8 }),
        reading({ guid: 'existing', year: 2025, month: 2, amount: 12 }),
        reading({ guid: 'invalid', year: 2025, month: 13, amount: 4 })
      ],
      facilities: [facility],
      currentReadings: [current],
      excludedReadingIds: [],
      skipExistingPredictorIds: [predictor.guid]
    });

    expect(rows[0]).toMatchObject({
      facilityName: 'Main Plant', unit: 'tons', keepExisting: true,
      newReadings: { count: 1 }, invalidReadings: { count: 1 }, existingReadings: { count: 1 }
    });
    expect(rows[0].newReadings.start).toEqual(new Date(2025, 0, 1));
    expect(rows[0].comparisons[0]).toMatchObject({
      currentValue: 10, importedValue: 12, difference: 2, percentageDifference: 20
    });
    expect(rows[0].invalidReadingDetails[0].messages).toContain('Month must be between 1 and 12.');
  });

  it('keeps duplicate months invalid until all but one active reading is excluded', () => {
    const first = reading({ guid: 'first', amount: 10 });
    const second = reading({ guid: 'second', amount: 12 });
    const options = {
      predictors: [predictor], readings: [first, second], facilities: [facility], currentReadings: [],
      skipExistingPredictorIds: []
    };

    const conflicted = buildImportPredictorReadingReview({ ...options, excludedReadingIds: [] })[0];
    expect(conflicted.invalidReadings.count).toBe(2);

    const resolved = buildImportPredictorReadingReview({ ...options, excludedReadingIds: [second.guid] })[0];
    expect(resolved.invalidReadings.count).toBe(1);
    expect(resolved.newReadings.count).toBe(1);
    expect(resolved.invalidReadingDetails[0]).toMatchObject({ key: `${second.guid}:1`, excluded: true });
  });

  it('uses predictor negative-value settings and reports unavailable zero-based percentages', () => {
    const negative = reading({ amount: -1 });
    expect(isImportPredictorReadingValid(negative, predictor)).toBe(false);
    expect(getImportPredictorReadingIssues(negative, predictor)).toContain('Negative values are not allowed for this predictor.');

    const row = buildImportPredictorReadingReview({
      predictors: [{ ...predictor, canBeNegative: true }],
      readings: [reading({ amount: 4 })], facilities: [facility],
      currentReadings: [reading({ guid: 'current', amount: 0 })],
      excludedReadingIds: [], skipExistingPredictorIds: []
    })[0];
    expect(row.comparisons[0].percentageDifference).toBeUndefined();
  });

  it('omits skipped predictors and supports mapped Weather predictors', () => {
    const weather = makePredictor({ guid: 'weather-a', predictorType: 'Weather', unit: 'HDD' });
    const rows = buildImportPredictorReadingReview({
      predictors: [{ ...predictor, skipImport: true }, weather],
      readings: [reading({ predictorId: weather.guid, weatherOverride: true })],
      facilities: [facility], currentReadings: [], excludedReadingIds: [], skipExistingPredictorIds: []
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ predictor: weather, unit: 'HDD', newReadings: { count: 1 } });
  });
});

function makePredictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
    predictorType: 'Standard', canBeNegative: false, ...overrides
  } as IdbPredictor;
}

function reading(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    year: 2025, month: 1, amount: 10, weatherOverride: false, weatherDataWarning: false,
    ...overrides
  } as IdbPredictorData;
}
