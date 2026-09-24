import { IdbPredictor } from '@data/models/idbModels/predictor';
import { buildWeatherStationGroups } from './weather-station-group.models';

describe('weather station groups', () => {
  it('groups repeated weather variants by station while preserving each predictor', () => {
    const groups = buildWeatherStationGroups([
      predictor('hdd-55', 'station-a', 'Oak Ridge', 'HDD', 55),
      predictor('hdd-65', 'station-a', 'Oak Ridge', 'HDD', 65),
      predictor('humidity', 'station-a', 'Oak Ridge', 'relativeHumidity'),
      { ...predictor('standard', '', '', 'HDD'), predictorType: 'Standard' }
    ], [], [], true);

    expect(groups).toHaveLength(1);
    expect(groups[0].routeKey).toBe('station:station-a');
    expect(groups[0].predictors.map(item => item.guid)).toEqual(['hdd-55', 'hdd-65', 'humidity']);
    expect(groups[0].outputSummary).toContain('Heating degree days');
  });

  it('keeps missing-station predictors as singleton repair groups', () => {
    const groups = buildWeatherStationGroups([
      predictor('missing-a', '', '', 'HDD'),
      predictor('missing-b', '', '', 'CDD')
    ], [], [], true);

    expect(groups.map(group => group.routeKey)).toEqual(['predictor:missing-a', 'predictor:missing-b']);
    expect(groups.every(group => group.needsStationRepair && group.statusTone === 'warning')).toBe(true);
  });

  it('flags conflicting names without splitting a station id', () => {
    const groups = buildWeatherStationGroups([
      predictor('a', 'station-a', 'Oak Ridge', 'HDD'),
      predictor('b', 'station-a', 'Knoxville', 'CDD')
    ], [], [], true);

    expect(groups).toHaveLength(1);
    expect(groups[0].hasConflictingStationNames).toBe(true);
    expect(groups[0].statusLabel).toBe('Station names differ');
  });
});

function predictor(
  guid: string,
  stationId: string,
  stationName: string,
  weatherDataType: IdbPredictor['weatherDataType'],
  base?: number
): IdbPredictor {
  return {
    guid, name: guid, predictorType: 'Weather', weatherStationId: stationId,
    weatherStationName: stationName, weatherDataType,
    heatingBaseTemperature: weatherDataType === 'HDD' ? base : undefined,
    coolingBaseTemperature: weatherDataType === 'CDD' ? base : undefined,
    production: false, unit: '', facilityId: 'facility-a', accountId: 'account-a'
  } as IdbPredictor;
}
