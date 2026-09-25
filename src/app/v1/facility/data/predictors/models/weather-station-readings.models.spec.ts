import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import {
  buildWeatherStationMonthChangeSet,
  buildWeatherStationMonthDeleteChangeSet,
  buildWeatherStationReadingMatrix
} from './weather-station-readings.models';

describe('weather station reading models', () => {
  const predictors = [predictor('hdd-55', 'HDD 55', 'HDD'), predictor('hdd-65', 'HDD 65', 'HDD')];

  it('builds repeated-type columns and inline status cells by month', () => {
    const matrix = buildWeatherStationReadingMatrix(predictors, [
      reading(1, 'a', 'hdd-55', 1, 10, { weatherDataWarning: true }),
      reading(2, 'b', 'hdd-65', 2, 20, { weatherOverride: true })
    ]);

    expect(matrix.columns.map(column => [column.predictor.name, column.typeLabel, column.unit])).toEqual([
      ['HDD 55', 'Heating degree days', 'days'], ['HDD 65', 'Heating degree days', 'days']
    ]);
    expect(matrix.rows).toHaveLength(2);
    expect(matrix.rows[0].cells[0].missing).toBe(true);
    expect(matrix.rows[0].cells[1].manualOverride).toBe(true);
    expect(matrix.rows[1].cells[0].weatherWarning).toBe(true);
  });

  it('adds missing records and only updates changed values as manual overrides', () => {
    const existing = [reading(1, 'a', 'hdd-55', 1, 10, { notes: 'keep me' })];
    const changes = buildWeatherStationMonthChangeSet('edit', 'station:A', predictors, existing, {
      year: 2026, month: 1,
      values: [{ predictorGuid: 'hdd-55', amount: 10 }, { predictorGuid: 'hdd-65', amount: 20 }]
    }, 7);

    expect(changes.update).toEqual([]);
    expect(changes.add).toEqual([expect.objectContaining({ predictorId: 'hdd-65', amount: 20, notes: '', weatherOverride: true })]);
    expect(existing[0].notes).toBe('keep me');
  });

  it('marks only changed stored values as overrides and preserves hidden notes', () => {
    const existing = [reading(1, 'a', 'hdd-55', 1, 10, { notes: 'keep me', weatherDataChanged: true })];
    const changes = buildWeatherStationMonthChangeSet('edit', 'station:A', [predictors[0]], existing, {
      year: 2026, month: 1, values: [{ predictorGuid: 'hdd-55', amount: 11 }]
    }, 7);

    expect(changes.update).toEqual([expect.objectContaining({ amount: 11, notes: 'keep me', weatherOverride: true, weatherDataChanged: false })]);
  });

  it('adds calculated values with their source warning without marking manual overrides', () => {
    const changes = buildWeatherStationMonthChangeSet('add', 'station:A', predictors, [], {
      year: 2026,
      month: 1,
      values: [
        { predictorGuid: 'hdd-55', amount: 10, calculated: true, weatherDataWarning: true },
        { predictorGuid: 'hdd-65', amount: 20, calculated: false, weatherDataWarning: true }
      ]
    }, 7);

    expect(changes.add).toEqual([
      expect.objectContaining({ predictorId: 'hdd-55', weatherOverride: false, weatherDataWarning: true }),
      expect.objectContaining({ predictorId: 'hdd-65', weatherOverride: true, weatherDataWarning: false })
    ]);
  });

  it('deletes every record in the station month, including duplicates', () => {
    const readings = [
      reading(1, 'a', 'hdd-55', 1, 10), reading(2, 'duplicate', 'hdd-55', 1, 11),
      reading(3, 'b', 'hdd-65', 1, 20), reading(4, 'later', 'hdd-65', 2, 21)
    ];
    const changes = buildWeatherStationMonthDeleteChangeSet('station:A', predictors, readings, 2026, 1, 2);
    expect(changes.delete.map(item => item.guid)).toEqual(['a', 'duplicate', 'b']);
  });
});

function predictor(guid: string, name: string, weatherDataType: IdbPredictor['weatherDataType']): IdbPredictor {
  return { guid, name, predictorType: 'Weather', weatherDataType, accountId: 'account-a', facilityId: 'facility-a' } as IdbPredictor;
}

function reading(
  id: number,
  guid: string,
  predictorId: string,
  month: number,
  amount: number,
  overrides: Partial<IdbPredictorData> = {}
): IdbPredictorData {
  return {
    id, guid, predictorId, accountId: 'account-a', facilityId: 'facility-a',
    year: 2026, month, amount, weatherOverride: false, weatherDataWarning: false,
    createdDate: new Date(), modifiedDate: new Date(), ...overrides
  };
}
