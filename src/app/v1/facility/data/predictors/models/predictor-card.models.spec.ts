import { buildPredictorCards, buildPredictorStatistics } from './predictor-card.models';

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

  it('requires one finite reading for every month in a twelve-month average', () => {
    const readings = Array.from({ length: 24 }, (_, index) => reading({
      guid: `reading-${index}`,
      year: 2024 + Math.floor(index / 12),
      month: index % 12 + 1,
      amount: index + 1
    }));

    const complete = buildPredictorStatistics(readings, 'tons');
    expect(complete.facts.map(fact => fact.valueLabel)).toEqual(['24', '12', '18.5', '6.5']);

    const withDuplicate = buildPredictorStatistics([
      ...readings,
      reading({ guid: 'duplicate', year: 2025, month: 12, amount: 100 })
    ], 'tons');
    expect(withDuplicate.facts[0]).toMatchObject({ valueLabel: 'Not available', unavailable: true });
    expect(withDuplicate.facts[2]).toMatchObject({ valueLabel: 'Not available', unavailable: true });
    expect(withDuplicate.facts[3]).toMatchObject({ valueLabel: '6.5', unavailable: false });
  });
});

function predictor(overrides: Record<string, unknown>): any {
  return { guid: 'predictor', name: 'Predictor', predictorType: 'Standard', production: false, unit: '', ...overrides };
}

function reading(overrides: Record<string, unknown>): any {
  return { guid: 'reading', predictorId: 'predictor', year: 2025, month: 1, amount: 1, ...overrides };
}
