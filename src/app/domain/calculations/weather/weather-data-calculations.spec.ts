import { HourlyWeatherReading } from '@platform/weather/hourly-weather-data.models';
import { getDetailedDataForMonth, hasWeatherDataWarning } from './weather-data-calculations';

describe('weather data calculations', () => {
  it('calculates degree days without mutating hourly input dates', () => {
    const firstTime = new Date(2026, 0, 1, 0, 0);
    const secondTime = new Date(2026, 0, 1, 12, 0);
    const readings: HourlyWeatherReading[] = [reading(firstTime, 50), reading(secondTime, 70)];

    const result = getDetailedDataForMonth(readings, 0, 2026, 65, 65, 'ABC', 'Station');

    expect(result[0].heatingDegreeDay).toBe(0);
    expect(result[1].heatingDegreeDay).toBe(2.5);
    expect(readings[0].time).toBe(firstTime);
    expect(readings[1].time).toBe(secondTime);
  });

  it.each([
    ['HDD', [], true],
    ['CDD', [{ gapInData: true }], true],
    ['relativeHumidity', [{ gapInData: false, relativeHumidity: Number.NaN }], true],
    ['relativeHumidity', [{ gapInData: false, relativeHumidity: 50 }], false]
  ] as const)('reports source warnings for %s', (type, values, expected) => {
    expect(hasWeatherDataWarning(values as any, type)).toBe(expected);
  });
});

function reading(time: Date, dryBulb: number): HourlyWeatherReading {
  return {
    time,
    dry_bulb_temp: dryBulb,
    humidity: 50,
    wet_bulb_temp: 45,
    dew_point_temp: 40,
    precipitation: 0
  };
}
