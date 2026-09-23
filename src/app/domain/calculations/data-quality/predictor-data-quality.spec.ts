import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  buildPredictorDataQualityReport,
  calculatePredictorDataQualityStatistics,
  predictorDataQualityUnit
} from './predictor-data-quality';

describe('predictor data quality', () => {
  it('calculates legacy predictor statistics and excludes non-finite values', () => {
    const statistics = calculatePredictorDataQualityStatistics([10, 10, 11, 12, 100, Number.NaN]);

    expect(statistics).toEqual({
      min: 10,
      max: 100,
      average: 28.6,
      median: 11,
      medianAbsDev: 1,
      lowerExpectedBound: 6,
      upperExpectedBound: 16,
      outliers: 1
    });
  });

  it('treats zero MAD as having no outliers and returns unavailable empty statistics', () => {
    expect(calculatePredictorDataQualityStatistics([10, 10, 10, 100]).outliers).toBe(0);
    expect(calculatePredictorDataQualityStatistics([])).toEqual(expect.objectContaining({
      min: Number.NaN,
      max: Number.NaN,
      outliers: 0
    }));
  });

  it('builds deterministic month issues and chronological chart rows', () => {
    const report = buildPredictorDataQualityReport([
      reading({ guid: 'late-b', month: 4, amount: 100, weatherDataChanged: true }),
      reading({ guid: 'early', month: 1, amount: -2, weatherDataWarning: true }),
      reading({ guid: 'late-a', month: 4, amount: 12 }),
      reading({ guid: 'middle', month: 2, amount: 11 })
    ], predictor());

    expect(report.duplicateMonths.map(month => [month.key, month.count])).toEqual([['2026-04', 2]]);
    expect(report.missingMonths.map(month => month.key)).toEqual(['2026-03']);
    expect(report.negativeMonths.map(month => month.key)).toEqual(['2026-01']);
    expect(report.weatherWarningMonths.map(month => month.key)).toEqual(['2026-01']);
    expect(report.weatherChangedMonths.map(month => month.key)).toEqual(['2026-04']);
    expect(report.chartRows.map(row => row.reading.guid)).toEqual(['early', 'middle', 'late-a', 'late-b']);
  });

  it('includes duplicate finite readings in statistics without synthesizing missing months', () => {
    const report = buildPredictorDataQualityReport([
      reading({ guid: 'one', month: 1, amount: 2 }),
      reading({ guid: 'two', month: 1, amount: 4 }),
      reading({ guid: 'three', month: 3, amount: 6 }),
      reading({ guid: 'invalid', month: 4, amount: Number.NaN })
    ], predictor());

    expect(report.statistics.average).toBe(4);
    expect(report.missingMonths.map(month => month.key)).toEqual(['2026-02']);
    expect(report.chartRows).toHaveLength(3);
    expect(report.hasData).toBe(true);
    expect(report.hasUsableData).toBe(true);
  });

  it('uses stored units and Weather fallbacks', () => {
    expect(predictorDataQualityUnit(predictor({ unit: 'tons' }))).toBe('tons');
    expect(predictorDataQualityUnit(predictor({ predictorType: 'Weather', weatherDataType: 'CDD', unit: '' }))).toBe('days');
    expect(predictorDataQualityUnit(predictor({ predictorType: 'Weather', weatherDataType: 'relativeHumidity', unit: undefined }))).toBe('%');
    expect(predictorDataQualityUnit(predictor({ unit: '' }))).toBe('');
  });
});

function predictor(overrides: Partial<IdbPredictor> = {}): IdbPredictor {
  return {
    guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', production: true, unit: '', canBeNegative: false,
    ignoreDateStatusChecks: false, ...overrides
  } as IdbPredictor;
}

function reading(overrides: Partial<IdbPredictorData> = {}): IdbPredictorData {
  return {
    guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    month: 1, year: 2026, amount: 10, weatherDataWarning: false, weatherDataChanged: false,
    weatherOverride: false, ...overrides
  } as IdbPredictorData;
}
