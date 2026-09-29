import { DetailDegreeDay, WeatherDataSelection, WeatherStation } from '@data/models/degreeDays';
import { HourlyWeatherReading } from '@platform/weather/hourly-weather-data.models';
import { ConvertValue } from '../conversions/convertValue';

/**
 * Legacy-compatible monthly weather calculations shared by v0 and v1.
 * Inputs are treated as immutable and values remain at full precision.
 */
export function getMonthlyDataFromYear(
  hourlyData: readonly HourlyWeatherReading[],
  year: number,
  baseHeatingTemperature: number,
  baseCoolingTemperature: number,
  station: WeatherStation
): DetailDegreeDay[] {
  const results: DetailDegreeDay[] = [];
  for (let month = 0; month < 12; month++) {
    results.push(...getDetailedDataForMonth(
      hourlyData,
      month,
      year,
      baseHeatingTemperature,
      baseCoolingTemperature,
      station.ID,
      station.name
    ));
  }
  return results;
}

export function getDetailedDataForMonth(
  hourlyData: readonly HourlyWeatherReading[],
  month: number,
  year: number,
  baseHeatingTemperature: number,
  baseCoolingTemperature: number,
  stationId: string,
  stationName: string
): DetailDegreeDay[] {
  const monthReadings = hourlyData
    .map(reading => ({ ...reading, time: new Date(reading.time) }))
    .filter(reading => reading.time.getMonth() === month
      && reading.time.getFullYear() === year
      && !Number.isNaN(asLegacyNumber(reading.dry_bulb_temp)));
  const results: DetailDegreeDay[] = [];
  const minutesPerDay = 1440;

  for (let index = 0; index < monthReadings.length; index++) {
    const reading = monthReadings[index];
    const previous = monthReadings[index - 1];
    const previousDate = previous
      ? new Date(previous.time)
      : new Date(reading.time.getFullYear(), reading.time.getMonth(), 1, 0, 0);
    const previousDryBulbTemp = previous
      ? asLegacyNumber(previous.dry_bulb_temp)
      : asLegacyNumber(reading.dry_bulb_temp);
    const previousRelativeHumidity = previous
      ? asLegacyNumber(previous.humidity)
      : asLegacyNumber(reading.humidity);
    const previousWetBulbTemp = previous
      ? asLegacyNumber(previous.wet_bulb_temp)
      : asLegacyNumber(reading.wet_bulb_temp);
    const previousDewPointTemp = previous
      ? asLegacyNumber(previous.dew_point_temp)
      : asLegacyNumber(reading.dew_point_temp);

    const minutesBetween = getMinutesBetweenDates(previousDate, reading.time);
    let gapInData = minutesBetween > 720;
    if (index === monthReadings.length - 1) {
      const endDate = new Date(reading.time.getFullYear(), reading.time.getMonth() + 1, 1, 0, 0);
      if (getMinutesBetweenDates(reading.time, endDate) > 720) gapInData = true;
    }

    const dryBulbTemp = asLegacyNumber(reading.dry_bulb_temp);
    const relativeHumidity = asLegacyNumber(reading.humidity);
    const wetBulbTemp = asLegacyNumber(reading.wet_bulb_temp);
    const dewPointTemp = asLegacyNumber(reading.dew_point_temp);
    const averageDryBulbTemp = (dryBulbTemp + previousDryBulbTemp) / 2;
    const averageWetBulbTemp = (wetBulbTemp + previousWetBulbTemp) / 2;
    const averageDewPointTemp = (dewPointTemp + previousDewPointTemp) / 2;
    const averageRelativeHumidity = (relativeHumidity + previousRelativeHumidity) / 2;
    const portionOfDay = minutesBetween / minutesPerDay;
    const heatingDegreeDifference = averageDryBulbTemp < baseHeatingTemperature
      ? baseHeatingTemperature - averageDryBulbTemp
      : 0;
    const coolingDegreeDifference = averageDryBulbTemp > baseCoolingTemperature
      ? averageDryBulbTemp - baseCoolingTemperature
      : 0;

    results.push({
      time: new Date(reading.time),
      heatingDegreeDay: heatingDegreeDifference * portionOfDay,
      heatingDegreeDifference,
      coolingDegreeDay: coolingDegreeDifference * portionOfDay,
      coolingDegreeDifference,
      percentOfDay: portionOfDay,
      dryBulbTemp,
      wetBulbTemp,
      dewPointTemp,
      lagDryBulbTemp: averageDryBulbTemp,
      stationId,
      stationName,
      gapInData,
      relativeHumidity,
      weightedRelativeHumidity: averageRelativeHumidity * minutesBetween,
      weightedDryBulbTemp: averageDryBulbTemp * minutesBetween,
      weightedWetBulbTemp: averageWetBulbTemp * minutesBetween,
      weightedDewPointTemp: averageDewPointTemp * minutesBetween,
      precipitation: asLegacyNumber(reading.precipitation),
      minutesBetween
    });
  }
  return results;
}

export function hasWeatherDataWarning(
  degreeDays: readonly DetailDegreeDay[],
  weatherDataSelection: WeatherDataSelection
): boolean {
  if (degreeDays.length === 0 || degreeDays.some(degreeDay => degreeDay.gapInData)) return true;
  if (weatherDataSelection === 'relativeHumidity') {
    return degreeDays.some(degreeDay => isMissingWeatherValue(degreeDay.relativeHumidity));
  }
  if (weatherDataSelection === 'wetBulbTemp') {
    return degreeDays.some(degreeDay => isMissingWeatherValue(degreeDay.wetBulbTemp));
  }
  return false;
}

export function getMinutesBetweenDates(firstDate: Date, secondDate: Date): number {
  const diffMilliseconds = Math.abs(new Date(firstDate).getTime() - new Date(secondDate).getTime());
  return new ConvertValue(diffMilliseconds, 'ms', 'min').convertedValue;
}

function asLegacyNumber(value: number | null | undefined): number {
  return Number(value);
}

function isMissingWeatherValue(value: number): boolean {
  return value === null || value === undefined || !Number.isFinite(value);
}
