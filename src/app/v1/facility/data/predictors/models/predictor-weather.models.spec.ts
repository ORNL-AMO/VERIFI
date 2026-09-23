import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { buildWeatherMaintenancePreview, defaultWeatherPredictorName } from './predictor-weather.models';

describe('predictor weather models', () => {
  it('uses established generated predictor names', () => {
    expect(defaultWeatherPredictorName('HDD', 60)).toBe('HDD Generated (60F)');
    expect(defaultWeatherPredictorName('relativeHumidity')).toBe('Relative Humidity');
  });

  it('adds range extensions and preserves manual overrides during source refresh', () => {
    const predictor = weatherPredictor();
    const readings = [reading('manual', 2026, 2, 99, true), reading('calculated', 2026, 3, 10, false)];
    const preview = buildWeatherMaintenancePreview(
      predictor,
      readings,
      { range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } }, sourceCheck: 'all' },
      [],
      4
    );

    expect(preview.rows.map(row => [row.key, row.kind])).toEqual([
      ['2026-01', 'added'], ['2026-02', 'preserved-override'], ['2026-03', 'changed']
    ]);
    expect(preview.add).toHaveLength(1);
    expect(preview.update).toEqual([expect.objectContaining({ guid: 'calculated', amount: 0 })]);
  });

  it('blocks ambiguous duplicate months', () => {
    const predictor = weatherPredictor();
    expect(() => buildWeatherMaintenancePreview(
      predictor,
      [reading('a', 2026, 1, 1, false), reading('b', 2026, 1, 2, false)],
      { range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } }, sourceCheck: 'all' },
      [],
      1
    )).toThrow('duplicate');
  });
});

function weatherPredictor() {
  return {
    ...getNewIdbPredictor('account-a', 'facility-a'),
    guid: 'predictor-a',
    predictorType: 'Weather' as const,
    weatherDataType: 'HDD' as const,
    weatherStationId: 'station-a',
    weatherStationName: 'Station A',
    heatingBaseTemperature: 60
  };
}

function reading(guid: string, year: number, month: number, amount: number, weatherOverride: boolean): IdbPredictorData {
  return {
    id: month,
    guid,
    accountId: 'account-a',
    facilityId: 'facility-a',
    predictorId: 'predictor-a',
    createdDate: new Date(),
    modifiedDate: new Date(),
    year,
    month,
    amount,
    weatherOverride,
    weatherDataWarning: false
  };
}
