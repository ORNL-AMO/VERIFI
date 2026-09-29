import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { buildWeatherStationStatusChecks } from './weather-station-status.models';

describe('weather station status checks', () => {
  it('groups shared reading checks and keeps quality checks predictor-specific', () => {
    const predictors = [
      { guid: 'cdd', name: 'CDD 65' },
      { guid: 'hdd', name: 'HDD 60' },
      { guid: 'humidity', name: 'Relative Humidity' }
    ] as any[];
    const entity = (guid: string, name: string) => ({
      kind: 'predictor' as const,
      guid,
      name,
      accountGuid: 'account-a',
      facilityGuid: 'facility-a'
    });
    const findings = presentFindings([
      makeFinding('predictor.weather.warning', 'warning', 'quality', entity('cdd', 'CDD 65')),
      makeFinding('predictor.weather.warning', 'warning', 'quality', entity('hdd', 'HDD 60')),
      makeFinding('predictor.weather.warning', 'warning', 'quality', entity('humidity', 'Relative Humidity')),
      makeFinding('predictor.quality.outlier', 'warning', 'quality', entity('cdd', 'CDD 65'), {
        count: 1,
        periods: ['2025-12']
      })
    ]);

    const checks = buildWeatherStationStatusChecks(predictors, findings);

    expect(checks).toHaveLength(2);
    expect(checks[0]).toEqual(expect.objectContaining({
      section: 'readings',
      scopeLabel: 'Readings',
      title: 'Review weather data',
      detail: '3 predictors: CDD 65, HDD 60, Relative Humidity',
      findingCount: 3,
      predictorGuids: ['cdd', 'hdd', 'humidity']
    }));
    expect(checks[1]).toEqual(expect.objectContaining({
      section: 'quality',
      scopeLabel: 'CDD 65 Quality',
      title: 'Review predictor outliers',
      findingCount: 1,
      predictorGuids: ['cdd']
    }));
  });

  it('ignores findings that do not belong to the station group', () => {
    const predictors = [{ guid: 'cdd', name: 'CDD 65' }] as any[];
    const findings = presentFindings([
      makeFinding('predictor.weather.warning', 'warning', 'quality', {
        kind: 'predictor', guid: 'other', name: 'Other', accountGuid: 'account-a', facilityGuid: 'facility-a'
      })
    ]);

    expect(buildWeatherStationStatusChecks(predictors, findings)).toEqual([]);
  });
});
