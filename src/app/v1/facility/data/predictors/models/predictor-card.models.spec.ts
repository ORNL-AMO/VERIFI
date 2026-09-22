import { buildPredictorCards } from './predictor-card.models';

describe('predictor card models', () => {
  it('sorts predictors and builds deterministic classification and reading facts', () => {
    const cards = buildPredictorCards([
      predictor({ guid: 'b', name: 'Zulu', production: false, predictorType: 'Weather', weatherDataType: 'CDD', unit: 'deg F' }),
      predictor({ guid: 'a', name: 'Alpha', production: true, predictorType: 'Standard', unit: 'tons' })
    ], [
      reading({ predictorId: 'a', year: 2025, month: 12 }),
      reading({ predictorId: 'a', year: 2024, month: 1 })
    ]);

    expect(cards.map(card => card.predictor.name)).toEqual(['Alpha', 'Zulu']);
    expect(cards[0]).toMatchObject({
      typeLabel: 'Standard',
      classificationLabel: 'Production',
      unitLabel: 'tons',
      readingCount: 2,
      firstReadingLabel: 'Jan 2024',
      latestReadingLabel: 'Dec 2025'
    });
    expect(cards[1]).toMatchObject({
      classificationLabel: 'Other',
      readingCount: 0,
      firstReadingLabel: 'No data',
      latestReadingLabel: 'No data'
    });
  });
});

function predictor(overrides: Record<string, unknown>): any {
  return { guid: 'predictor', name: 'Predictor', predictorType: 'Standard', production: false, unit: '', ...overrides };
}

function reading(overrides: Record<string, unknown>): any {
  return { predictorId: 'predictor', year: 2025, month: 1, ...overrides };
}
