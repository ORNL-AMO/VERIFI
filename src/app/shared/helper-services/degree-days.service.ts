import { Injectable } from '@angular/core';
import { EGridService } from './e-grid.service';
import * as _ from 'lodash';
import { DetailDegreeDay, LocalClimatologicalData, WeatherStation } from 'src/app/models/degreeDays';
import * as Papa from 'papaparse';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';

@Injectable({
  providedIn: 'root'
})
export class DegreeDaysService {

  stationDataResponse: { station: WeatherStation, response: Response, year: number, dataResults: string };
  yearHourlyData: Array<LocalClimatologicalData>;
  constructor(private eGridService: EGridService) { }

  async getDailyDataFromMonth(month: number, year: number, baseHeatingTemperature: number, baseCoolingTemperature: number, stationId: string): Promise<Array<DetailDegreeDay>> {
    await this.setYearHourlyData(month, year, stationId);
    if (this.yearHourlyData) {
      return this.getDetailedDataForMonth(month, baseHeatingTemperature, baseCoolingTemperature);
    } else {
      return [];
    }
  }

  async getMonthlyDataFromYear(year: number, baseHeatingTemperature: number, baseCoolingTemperature: number, station: WeatherStation): Promise<Array<DetailDegreeDay>> {
    await this.setYearHourlyData(0, year, station.ID);
    if (this.yearHourlyData) {
      let startDate: Date = new Date(year, 0, 1);
      let endDate: Date = new Date(year + 1, 0, 1);
      let detailedDegreeDays: Array<DetailDegreeDay> = new Array();
      while (startDate < endDate) {
        let monthDetailedDegreeDay: Array<DetailDegreeDay> = this.getDetailedDataForMonth(startDate.getMonth(), baseHeatingTemperature, baseCoolingTemperature);
        monthDetailedDegreeDay.forEach(detailDegreeDay => {
          detailedDegreeDays.push(detailDegreeDay);
        });
        startDate.setMonth(startDate.getMonth() + 1);
      }
      return detailedDegreeDays;
    } else {
      return [];
    }
  }

  async setYearHourlyData(month: number, year: number, stationId: string) {
    if (!this.stationDataResponse || this.stationDataResponse.station.ID != stationId || this.stationDataResponse.year != year) {
      let station: WeatherStation;
      if (!this.stationDataResponse || (this.stationDataResponse.station.ID != stationId)) {
        station = await this.getStationById(stationId);
      } else {
        station = this.stationDataResponse.station;
      }
      if (station) {
        let neededDate: Date = new Date(year, month, 1);
        if (neededDate >= station.begin && neededDate <= station.end) {
          let response: Response = await this.getStationDataResponse(station, year);
          let dataResults: string = await response.text();
          this.stationDataResponse = {
            response: response,
            station: station,
            year: year,
            dataResults: dataResults
          }
          this.yearHourlyData = this.getStationYearLCDFromResults(station, dataResults);
        } else {
          this.yearHourlyData = undefined;
        }
      } else {
        this.yearHourlyData = undefined;
      }
    }
  }


  getDetailedDataForMonth(month: number, baseHeatingTemperature: number, baseCoolingTemperature: number): Array<DetailDegreeDay> {
    let results: Array<DetailDegreeDay> = new Array();
    let localClimatologicalDataMonth: Array<LocalClimatologicalData> = this.yearHourlyData.filter(lcd => {
      return lcd.DATE.getMonth() == month;
    });
    let minutesPerDay: number = 1440;
    let stationId: string;
    let stationName: string;
    if (this.yearHourlyData[0]) {
      stationId = this.yearHourlyData[0].stationId;
      stationName = this.yearHourlyData[0].STATION;
    }
    for (let i = 0; i < localClimatologicalDataMonth.length; i++) {
      let previousDate: Date;
      let previousDryBulbTemp: number;
      let previousRelativeHumidity: number;
      if (i == 0) {
        let startDate: Date = new Date(localClimatologicalDataMonth[i].DATE);
        previousDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 0, 0);
        previousDryBulbTemp = localClimatologicalDataMonth[i].HourlyDryBulbTemperature;
        previousRelativeHumidity = localClimatologicalDataMonth[i].HourlyRelativeHumidity;
      } else {
        previousDate = new Date(localClimatologicalDataMonth[i - 1].DATE)
        previousDryBulbTemp = localClimatologicalDataMonth[i - 1].HourlyDryBulbTemperature;
        previousRelativeHumidity = localClimatologicalDataMonth[i - 1].HourlyRelativeHumidity;
      }

      let gapInData: boolean = false
      let minutesBetween: number = this.getMinutesBetweenDates(previousDate, localClimatologicalDataMonth[i].DATE);
      if (minutesBetween > 720) {
        gapInData = true;
      }

      if (i == (localClimatologicalDataMonth.length - 1)) {
        let currentDate: Date = new Date(localClimatologicalDataMonth[i].DATE);
        let endDate: Date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 0, 0);
        let minutesBetween: number = this.getMinutesBetweenDates(localClimatologicalDataMonth[i].DATE, endDate);
        if (minutesBetween > 720) {
          gapInData = true;
        }
      }

      let averageDryBulbTemp: number = (localClimatologicalDataMonth[i].HourlyDryBulbTemperature + previousDryBulbTemp) / 2
 

      let baseRelativeHumidity: number = localClimatologicalDataMonth[i].HourlyRelativeHumidity;
      let averageRelativeHumidity: number = (baseRelativeHumidity + previousRelativeHumidity) / 2
      let portionOfDay: number = (minutesBetween / minutesPerDay);
      
      if (averageDryBulbTemp < baseHeatingTemperature || averageDryBulbTemp > baseCoolingTemperature) {

        let heatingDegreeDay: number = 0;
        let heatingDegreeDifference: number = 0;
        let coolingDegreeDay: number = 0;
        let coolingDegreeDifference: number = 0;
        if (averageDryBulbTemp < baseHeatingTemperature) {
          heatingDegreeDifference = baseHeatingTemperature - averageDryBulbTemp;
          heatingDegreeDay = heatingDegreeDifference * portionOfDay;
        }
        if (averageDryBulbTemp > baseCoolingTemperature) {
          coolingDegreeDifference = averageDryBulbTemp - baseCoolingTemperature;
          coolingDegreeDay = coolingDegreeDifference * portionOfDay;
        }

        results.push({
          time: localClimatologicalDataMonth[i].DATE,
          heatingDegreeDay: heatingDegreeDay,
          heatingDegreeDifference: heatingDegreeDifference,
          coolingDegreeDay: coolingDegreeDay,
          coolingDegreeDifference: coolingDegreeDifference,
          percentOfDay: portionOfDay,
          dryBulbTemp: localClimatologicalDataMonth[i].HourlyDryBulbTemperature,
          lagDryBulbTemp: averageDryBulbTemp,
          stationId: stationId,
          stationName: stationName,
          gapInData: gapInData,
          relativeHumidity: localClimatologicalDataMonth[i].HourlyRelativeHumidity,
          weightedRelativeHumidity: (averageRelativeHumidity * (1 - (portionOfDay/100)))
        })
      } else {
        results.push({
          time: localClimatologicalDataMonth[i].DATE,
          heatingDegreeDay: 0,
          heatingDegreeDifference: 0,
          coolingDegreeDay: 0,
          coolingDegreeDifference: 0,
          percentOfDay: portionOfDay,
          dryBulbTemp: localClimatologicalDataMonth[i].HourlyDryBulbTemperature,
          lagDryBulbTemp: averageDryBulbTemp,
          stationId: stationId,
          stationName: stationName,
          gapInData: gapInData,
          relativeHumidity: localClimatologicalDataMonth[i].HourlyRelativeHumidity,
          weightedRelativeHumidity: (averageRelativeHumidity * (1 - (portionOfDay/100)))
        })
      }
    }
    return results;
  }

  //find weather station closest to zip code
  async getClosestStation(zipCode: string, furthestDistance: number, neededMonth?: { year: number, month: number }): Promise<Array<WeatherStation>> {
    let stationLatLong: { ZIP: string, LAT: string, LNG: string } = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == zipCode });
    if (stationLatLong) {
      let fetchStations = await fetch("https://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.csv");
      let stationsResults = await fetchStations.text();

      let closestStations: Array<WeatherStation> = new Array();
      let neededDate: Date;
      if (neededMonth) {
        neededDate = new Date(neededMonth.year, neededMonth.month, 1)
      }
      let parsedData: Array<any> = Papa.parse(stationsResults, { header: true }).data;
      for (let i = 0; i < parsedData.length; i++) {
        let parseDataLine = parsedData[i];
        if (parseDataLine['BEGIN'] && parseDataLine['END'] && parseDataLine['USAF'] && parseDataLine['WBAN']) {
          let station: WeatherStation = this.parseStation(parseDataLine);
          station.distanceFrom = this.haversine(Number(stationLatLong.LAT), Number(stationLatLong.LNG), Number(station.lat), Number(station.lon));
          if (station.distanceFrom <= furthestDistance) {
            let includeStation: boolean = true;
            if (neededDate) {
              if (station.begin >= neededDate || station.end <= neededDate) {
                includeStation = false;
              }
            } else if (station.end < new Date(2013, 0, 1)) {
              includeStation = false;
            }
            if (includeStation) {
              closestStations.push(station);
            }
          }

        }
      }
      return _.orderBy(closestStations, (station: WeatherStation) => { return station.distanceFrom }, 'asc');
    }
    return [];
  }

  async getStationDataResponse(weatherStation: WeatherStation, year: number): Promise<Response> {
    return await fetch("https://www.ncei.noaa.gov/data/local-climatological-data/access/" + year + "/" + weatherStation.ID + ".csv");
  }

  getStationYearLCDFromResults(weatherStation: WeatherStation, dataResults: string): Array<LocalClimatologicalData> {
    let parsedData: Array<any> = Papa.parse(dataResults, { header: true }).data;
    let localData: Array<LocalClimatologicalData> = new Array();
    // let reportTypes = [];
    for (let i = 1; i < parsedData.length; i++) {
      let currentLine = parsedData[i];
      let dryBulbTemp: number = parseFloat(currentLine['HourlyDewPointTemperature']);
      // reportTypes.push(currentLine['REPORT_TYPE']);
      if (currentLine['REPORT_TYPE'] == 'FM-15' && isNaN(dryBulbTemp) == false) {
        // if (isNaN(dryBulbTemp) == false) {
        let hourData: LocalClimatologicalData = {
          stationId: weatherStation.ID,
          STATION: weatherStation.name,
          DATE: new Date(currentLine['DATE']),
          LATITUDE: currentLine['LATITUDE'],
          LONGITUDE: currentLine['LONGITUDE'],
          ELEVATION: currentLine['ELEVATION'],
          NAME: currentLine['NAME'],
          REPORT_TYPE: currentLine['REPORT_TYPE'],
          SOURCE: currentLine['SOURCE'],
          HourlyAltimeterSetting: parseFloat(currentLine['HourlyAltimeterSetting']),
          HourlyDewPointTemperature: parseFloat(currentLine['HourlyDewPointTemperature']),
          HourlyDryBulbTemperature: parseFloat(currentLine['HourlyDryBulbTemperature']),
          HourlyPrecipitation: parseFloat(currentLine['HourlyPrecipitation']),
          HourlyPresentWeatherType: currentLine['HourlyPresentWeatherType'],
          HourlyPressureChange: parseFloat(currentLine['HourlyPressureChange']),
          HourlyPressureTendency: parseFloat(currentLine['HourlyPressureTendency']),
          HourlyRelativeHumidity: parseFloat(currentLine['HourlyRelativeHumidity']),
          HourlySkyConditions: parseFloat(currentLine['HourlySkyConditions']),
          HourlySeaLevelPressure: parseFloat(currentLine['HourlySeaLevelPressure']),
          HourlyStationPressure: parseFloat(currentLine['HourlyStationPressure']),
          HourlyVisibility: parseFloat(currentLine['HourlyVisibility']),
          HourlyWetBulbTemperature: parseFloat(currentLine['HourlyWetBulbTemperature']),
          HourlyWindDirection: parseFloat(currentLine['HourlyWindDirection']),
          HourlyWindGustSpeed: parseFloat(currentLine['HourlyWindGustSpeed']),
          HourlyWindSpeed: parseFloat(currentLine['HourlyWindSpeed'])
        }
        localData.push(hourData);
      }
    }
    // reportTypes = _.uniq(reportTypes);
    // console.log(reportTypes);
    return localData;
  }



  /// Haversine formula to calculate approximate distances between coordinate pairs
  ///Taken from ORNL-Weather
  haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // average radius of Earth in miles
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getMinutesBetweenDates(firstDate: Date, secondDate: Date): number {
    let diffMilliseconds = Math.abs(firstDate.getTime() - secondDate.getTime());
    let diffMinutes: number = new ConvertValue(diffMilliseconds, 'ms', 'min').convertedValue;
    return diffMinutes;
  }


  async getStationById(stationID: string): Promise<WeatherStation> {
    let fetchStations = await fetch("https://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.csv");
    let stationsResults = await fetchStations.text();
    let parsedData: Array<any> = Papa.parse(stationsResults, { header: true }).data;
    for (let i = 0; i < parsedData.length; i++) {
      let parseDataLine = parsedData[i];
      if (parseDataLine['BEGIN'] && parseDataLine['END'] && parseDataLine['USAF'] && parseDataLine['WBAN']) {
        let station: WeatherStation = this.parseStation(parseDataLine);
        if (station.ID == stationID) {
          return station;
        }
      }
    }
    return;
  }

  parseStation(stationLine: any): WeatherStation {
    // HEADERS
    // "USAF"
    // "WBAN"
    // "STATION NAME"
    // "CTRY"
    // "STATE"
    // "ICAO"
    // "LAT"
    // "LON"
    // "ELEV(M)"
    // "BEGIN"
    // "END"
    //API start/end date format YYYYMMDD
    let begin: string = stationLine['BEGIN'];
    let beginYear: number = parseFloat(begin.slice(0, 4));
    let beginMonth: number = parseFloat(begin.slice(4, 6));
    let beginDay: number = parseFloat(begin.slice(6, 8));
    //Month 0 indexed
    let startDate: Date = new Date(beginYear, beginMonth - 1, beginDay);
    // let endDate: Date;
    let end: string = stationLine['END'];
    let endYear: number = parseFloat(end.slice(0, 4));
    let endMonth: number = parseFloat(end.slice(4, 6));
    let endDay: number = parseFloat(end.slice(6, 8));
    //Month 0 indexed
    let endDate: Date = new Date(endYear, endMonth - 1, endDay);
    let USAF: string = stationLine['USAF'];
    let WBAN: string = stationLine['WBAN'];
    let ID: string = USAF + WBAN;
    return {
      name: stationLine['STATION NAME'],
      country: stationLine['CTRY'],
      state: stationLine['STATE'],
      lat: stationLine['LAT'],
      lon: stationLine['LON'],
      begin: startDate,
      end: endDate,
      USAF: USAF,
      WBAN: WBAN,
      ID: ID,
      distanceFrom: undefined
    }
  }
}