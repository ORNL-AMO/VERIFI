import { analysisReportFixture, regressionAnalysisReportFixture } from './testing/analysis-report-fixtures';
import { buildDataQualityMeterInputs, buildDataQualityPredictorInputs } from './data-quality-report-inputs';

describe('Data Quality raw meter inputs', () => {
  it('detaches all years of readings, deduplicates selections, and excludes foreign ownership', () => {
    const snapshot = analysisReportFixture();
    const first = snapshot.meterData[0];
    const inputs = buildDataQualityMeterInputs({ ...snapshot, meterData: [...snapshot.meterData,
      { ...first, guid: 'foreign-facility', facilityId: 'other' }, { ...first, guid: 'foreign-account', accountId: 'other' },
      { ...first, guid: 'unselected', meterId: 'other' }] }, 'facility', ['meter', 'meter']);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].readings).toHaveLength(36);
    expect(new Set(inputs[0].readings.map(reading => reading.year))).toEqual(new Set([2022, 2023, 2024]));
    inputs[0].meter.name = 'Detached'; inputs[0].readings[0].totalEnergyUse = -1;
    expect(snapshot.meters[0].name).not.toBe('Detached'); expect(first.totalEnergyUse).toBe(100.25);
  });
  it('retains meters without readings and rejects unavailable references', () => {
    const snapshot = analysisReportFixture();
    expect(buildDataQualityMeterInputs({ ...snapshot, meterData: [] }, 'facility', ['meter'])[0].readings).toEqual([]);
    expect(() => buildDataQualityMeterInputs(snapshot, 'facility', ['deleted'])).toThrow('selected meter is unavailable');
    expect(() => buildDataQualityMeterInputs(snapshot, 'deleted', [])).toThrow('facility is unavailable');
  });
});

describe('Data Quality raw predictor inputs', () => {
  it('detaches full history, deduplicates GUIDs, and excludes other accounts, facilities, and predictors', () => {
    const snapshot = regressionAnalysisReportFixture();
    const predictor = snapshot.predictors[0], first = snapshot.predictorData[0];
    const inputs = buildDataQualityPredictorInputs({ ...snapshot, predictorData: [...snapshot.predictorData,
      { ...first, guid: 'foreign-facility', facilityId: 'other' }, { ...first, guid: 'foreign-account', accountId: 'other' },
      { ...first, guid: 'unselected', predictorId: 'other' }] }, 'facility', [predictor.guid, predictor.guid]);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].readings).toHaveLength(36);
    expect(new Set(inputs[0].readings.map(reading => reading.year))).toEqual(new Set([2022, 2023, 2024]));
    inputs[0].predictor.name = 'Detached'; inputs[0].readings[0].amount = -1;
    expect(predictor.name).not.toBe('Detached'); expect(first.amount).not.toBe(-1);
  });
  it('retains predictors without readings and rejects unavailable or foreign references', () => {
    const snapshot = regressionAnalysisReportFixture(), guid = snapshot.predictors[0].guid;
    expect(buildDataQualityPredictorInputs({ ...snapshot, predictorData: [] }, 'facility', [guid])[0].readings).toEqual([]);
    expect(() => buildDataQualityPredictorInputs(snapshot, 'facility', ['deleted'])).toThrow('selected predictor is unavailable');
    expect(() => buildDataQualityPredictorInputs({ ...snapshot, predictors: snapshot.predictors.map(predictor => ({ ...predictor, accountId: 'other' })) },
      'facility', [guid])).toThrow('selected predictor is unavailable');
    expect(() => buildDataQualityPredictorInputs(snapshot, 'deleted', [])).toThrow('facility is unavailable');
  });
});
