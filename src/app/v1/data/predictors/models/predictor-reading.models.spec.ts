import {
  buildPredictorReadingTableView,
  createPredictorReading,
  findMissingPredictorMonths
} from './predictor-reading.models';

describe('predictor reading models', () => {
  const predictor = {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', canBeNegative: false, unit: 'tons'
  } as any;

  it('marks duplicates, invalid values, and disallowed negatives for attention', () => {
    const view = buildPredictorReadingTableView(predictor, [
      reading('a', 2026, 1, 10), reading('b', 2026, 1, -2), reading('c', 2026, 2, Number.NaN)
    ]);

    expect(view.rows.map(row => row.attention)).toEqual([
      expect.objectContaining({ duplicateMonth: true, hasAttention: true }),
      expect.objectContaining({ duplicateMonth: true, negativeValue: true, hasAttention: true }),
      expect.objectContaining({ invalidValue: true, hasAttention: true })
    ]);
  });

  it('finds only internal missing months and ignores duplicate entries', () => {
    expect(findMissingPredictorMonths([
      reading('a', 2025, 12, 1), reading('b', 2025, 12, 2), reading('c', 2026, 3, 3)
    ])).toEqual([
      expect.objectContaining({ key: '2026-01', label: 'Jan 2026' }),
      expect.objectContaining({ key: '2026-02', label: 'Feb 2026' })
    ]);
  });

  it('creates Weather readings as manual overrides', () => {
    const created = createPredictorReading({ ...predictor, predictorType: 'Weather' }, [reading('a', 2026, 1, 2)]);

    expect(created).toEqual(expect.objectContaining({ month: 2, year: 2026, weatherOverride: true, weatherDataWarning: false }));
    expect(created.id).toBeUndefined();
  });

  it('marks revised weather source data for attention', () => {
    const revised = { ...reading('a', 2026, 1, 2), weatherDataChanged: true };
    const view = buildPredictorReadingTableView({ ...predictor, predictorType: 'Weather' }, [revised]);

    expect(view.rows[0].attention).toEqual(expect.objectContaining({ weatherDataChanged: true, hasAttention: true }));
  });
});

function reading(guid: string, year: number, month: number, amount: number): any {
  return {
    id: guid.charCodeAt(0), guid, predictorId: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a',
    year, month, amount, notes: '', weatherDataWarning: false, weatherOverride: false
  };
}
