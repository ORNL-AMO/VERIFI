import { ConvertValue } from "../calculations/conversions/convertValue";
import { DetailDegreeDay, WeatherStation } from "../models/degreeDays";
import { WeatherDataReading } from "./weather-data.service";


export function getMonthlyDataFromYear(hourlyData: Array<WeatherDataReading>, year: number, baseHeatingTemperature: number, baseCoolingTemperature: number, station: WeatherStation): Array<DetailDegreeDay> {
    let startDate: Date = new Date(year, 0, 1);
    let endDate: Date = new Date(year + 1, 0, 1);
    let detailedDegreeDays: Array<DetailDegreeDay> = new Array();
    while (startDate < endDate) {
        let monthDetailedDegreeDay: Array<DetailDegreeDay> = getDetailedDataForMonth(hourlyData, startDate.getMonth(), year, baseHeatingTemperature, baseCoolingTemperature, station.ID, station.name);
        monthDetailedDegreeDay.forEach(detailDegreeDay => {
            detailedDegreeDays.push(detailDegreeDay);
        });
        startDate.setMonth(startDate.getMonth() + 1);
    }
    return detailedDegreeDays;
}

export function getDetailedDataForMonth(hourlyData: Array<WeatherDataReading>, month: number, year: number, baseHeatingTemperature: number, baseCoolingTemperature: number, stationId: string, stationName: string): Array<DetailDegreeDay> {
    let results: Array<DetailDegreeDay> = new Array();
    let localClimatologicalDataMonth: Array<WeatherDataReading> = hourlyData.filter(lcd => {
        lcd.time = new Date(lcd.time);
        return lcd.time.getMonth() == month && lcd.time.getFullYear() == year && isNaN(lcd.dry_bulb_temp) == false;
    });
    let minutesPerDay: number = 1440;
    for (let i = 0; i < localClimatologicalDataMonth.length; i++) {
        let previousDate: Date;
        let previousDryBulbTemp: number;
        let previousRelativeHumidity: number;
        if (i == 0) {
            let startDate: Date = new Date(localClimatologicalDataMonth[i].time);
            previousDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 0, 0);
            previousDryBulbTemp = localClimatologicalDataMonth[i].dry_bulb_temp;
            previousRelativeHumidity = localClimatologicalDataMonth[i].humidity;
        } else {
            previousDate = new Date(localClimatologicalDataMonth[i - 1].time)
            previousDryBulbTemp = localClimatologicalDataMonth[i - 1].dry_bulb_temp;
            previousRelativeHumidity = localClimatologicalDataMonth[i - 1].humidity;
        }

        let gapInData: boolean = false
        let minutesBetween: number = getMinutesBetweenDates(previousDate, localClimatologicalDataMonth[i].time);
        if (minutesBetween > 720) {
            gapInData = true;
        }

        if (i == (localClimatologicalDataMonth.length - 1)) {
            let currentDate: Date = new Date(localClimatologicalDataMonth[i].time);
            let endDate: Date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 0, 0);
            let minutesBetween: number = getMinutesBetweenDates(localClimatologicalDataMonth[i].time, endDate);
            if (minutesBetween > 720) {
                gapInData = true;
            }
        }

        let averageDryBulbTemp: number = (localClimatologicalDataMonth[i].dry_bulb_temp + previousDryBulbTemp) / 2


        let baseRelativeHumidity: number = localClimatologicalDataMonth[i].humidity;
        let averageRelativeHumidity: number = (baseRelativeHumidity + previousRelativeHumidity) / 2
        let portionOfDay: number = (minutesBetween / minutesPerDay);

        // weightedRelativeHumidity: (averageRelativeHumidity * (1 - (portionOfDay/100))),
        // weightedDryBulbTemp: (averageDryBulbTemp * (1 - (portionOfDay/100))),
        let weightedRelativeHumidity: number = (averageRelativeHumidity * minutesBetween);
        let weightedDryBulbTemp: number = (averageDryBulbTemp * minutesBetween);
        if (averageDryBulbTemp < baseHeatingTemperature || averageDryBulbTemp > baseCoolingTemperature) {
            let heatingDegreeDay: number = 0;
            let heatingDegreeDifference: number = 0;
            let coolingDegreeDay: number = 0;
            let coolingDegreeDifference: number = 0;
            if (averageDryBulbTemp < baseHeatingTemperature) {
                heatingDegreeDifference = baseHeatingTemperature - averageDryBulbTemp;
                heatingDegreeDay = heatingDegreeDifference * portionOfDay;
            }

            let gapInData: boolean = false
            let minutesBetween: number = getMinutesBetweenDates(previousDate, localClimatologicalDataMonth[i].time);
            if (minutesBetween > 720) {
                gapInData = true;
            }
            if (averageDryBulbTemp < baseHeatingTemperature || averageDryBulbTemp > baseCoolingTemperature) {
                if (averageDryBulbTemp < baseHeatingTemperature) {
                    heatingDegreeDifference = baseHeatingTemperature - averageDryBulbTemp;
                    heatingDegreeDay = heatingDegreeDifference * portionOfDay;
                }
                if (averageDryBulbTemp > baseCoolingTemperature) {
                    coolingDegreeDifference = averageDryBulbTemp - baseCoolingTemperature;
                    coolingDegreeDay = coolingDegreeDifference * portionOfDay;
                }
            }

            results.push({
                time: localClimatologicalDataMonth[i].time,
                heatingDegreeDay: heatingDegreeDay,
                heatingDegreeDifference: heatingDegreeDifference,
                coolingDegreeDay: coolingDegreeDay,
                coolingDegreeDifference: coolingDegreeDifference,
                percentOfDay: portionOfDay,
                dryBulbTemp: localClimatologicalDataMonth[i].dry_bulb_temp,
                lagDryBulbTemp: averageDryBulbTemp,
                stationId: stationId,
                stationName: stationName,
                gapInData: gapInData,
                relativeHumidity: localClimatologicalDataMonth[i].humidity,
                weightedRelativeHumidity: weightedRelativeHumidity,
                weightedDryBulbTemp: weightedDryBulbTemp,
                minutesBetween: minutesBetween
            })
        } else {
            results.push({
                time: localClimatologicalDataMonth[i].time,
                heatingDegreeDay: 0,
                heatingDegreeDifference: 0,
                coolingDegreeDay: 0,
                coolingDegreeDifference: 0,
                percentOfDay: portionOfDay,
                dryBulbTemp: localClimatologicalDataMonth[i].dry_bulb_temp,
                lagDryBulbTemp: averageDryBulbTemp,
                stationId: stationId,
                stationName: stationName,
                gapInData: gapInData,
                relativeHumidity: localClimatologicalDataMonth[i].humidity,
                weightedRelativeHumidity: weightedRelativeHumidity,
                weightedDryBulbTemp: weightedDryBulbTemp,
                minutesBetween: minutesBetween
            })
        }
    }
    return results;
}

export function getMinutesBetweenDates(firstDate: Date, secondDate: Date): number {
    let diffMilliseconds = Math.abs(new Date(firstDate).getTime() - new Date(secondDate).getTime());
    let diffMinutes: number = new ConvertValue(diffMilliseconds, 'ms', 'min').convertedValue;
    return diffMinutes;
}