import { Injectable } from '@angular/core';
import { EGridService } from './e-grid.service';
import * as _ from 'lodash';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { DegreeDay, DetailDegreeDay, LocalClimatologicalData, WeatherStation } from 'src/app/models/degreeDays';
import * as Papa from 'papaparse';

@Injectable({
  providedIn: 'root'
})
export class DegreeDaysService {

  stationDataResponse: { station: WeatherStation, response: Response, year: number, dataResults: string };
  yearHourlyData: Array<LocalClimatologicalData>;
  constructor(private eGridService: EGridService, private convertUnitsService: ConvertUnitsService) { }

  async getHeatingDegreeDays(zipCode: string, month: number, year: number, baseHeatingTemperature: number, baseCoolingTemperature: number): Promise<Array<DegreeDay>> {
    let stationsWithinFortyMiles: Array<WeatherStation> = await this.getClosestStation(zipCode, 40, { year: year, month: month });
    let stationDataResponse: { station: WeatherStation, response: Response, localClimatologicalDataYear: Array<LocalClimatologicalData> } = await this.getClosestStationData(stationsWithinFortyMiles, year);
    // let localClimatologicalDataYear: Array<LocalClimatologicalData> = await this.getStationYearLCD(stationDataResponse.station, stationDataResponse.response);
    let localClimatologicalDataMonth: Array<LocalClimatologicalData> = stationDataResponse.localClimatologicalDataYear.filter(lcd => {
      return lcd.DATE.getMonth() == month;
    });
    let startDate: Date = new Date(year, month, 1);
    let endDate: Date = new Date(year, month + 1, 1);
    let degreeDays: Array<DegreeDay> = new Array();
    while (startDate < endDate) {
      let degreeDay: DegreeDay = this.calculateHeatingDegreeDaysForDate(startDate, localClimatologicalDataMonth, baseHeatingTemperature, baseCoolingTemperature);
      degreeDays.push(degreeDay);
      startDate.setDate(startDate.getDate() + 1);
    }
    return degreeDays;
  }


  async getDailyDataFromMonth(month: number, year: number, baseHeatingTemperature: number, baseCoolingTemperature: number, station: WeatherStation): Promise<Array<DegreeDay>> {
    if (!this.stationDataResponse || this.stationDataResponse.station.ID != station.ID || this.stationDataResponse.year != year) {
      let response: Response = await this.getStationDataResponse(station, year);
      let dataResults: string = await response.text();
      this.stationDataResponse = {
        response: response,
        station: station,
        year: year,
        dataResults: dataResults
      }
      this.yearHourlyData = this.getStationYearLCDFromResults(station, dataResults);
    }
    let localClimatologicalDataMonth: Array<LocalClimatologicalData> = this.yearHourlyData.filter(lcd => {
      return lcd.DATE.getMonth() == month;
    });
    let startDate: Date = new Date(year, month, 1);
    let endDate: Date = new Date(year, month + 1, 1);
    let degreeDays: Array<DegreeDay> = new Array();
    while (startDate < endDate) {
      let degreeDay: DegreeDay = this.calculateHeatingDegreeDaysForDate(startDate, localClimatologicalDataMonth, baseHeatingTemperature, baseCoolingTemperature);
      degreeDays.push(degreeDay);
      startDate.setDate(startDate.getDate() + 1);
    }
    return degreeDays;
  }

  async getMonthlyDataFromYear(year: number, baseHeatingTemperature: number, baseCoolingTemperature: number, station: WeatherStation): Promise<Array<DegreeDay>> {
    if (!this.stationDataResponse || this.stationDataResponse.station.ID != station.ID || this.stationDataResponse.year != year) {
      let response: Response = await this.getStationDataResponse(station, year);
      let dataResults: string = await response.text();
      this.stationDataResponse = {
        response: response,
        station: station,
        year: year,
        dataResults: dataResults
      }
      this.yearHourlyData = this.getStationYearLCDFromResults(station, dataResults);
    }

    let startDate: Date = new Date(year, 0, 1);
    let endDate: Date = new Date(year + 1, 0, 1);
    let degreeDays: Array<DegreeDay> = new Array();
    while (startDate < endDate) {
      let localClimatologicalDataMonth: Array<LocalClimatologicalData> = this.yearHourlyData.filter(lcd => {
        return lcd.DATE.getMonth() == startDate.getMonth();
      });
      let degreeDay: DegreeDay = this.calculateHeatingDegreeDaysForDate(startDate, localClimatologicalDataMonth, baseHeatingTemperature, baseCoolingTemperature);
      degreeDays.push(degreeDay);
      startDate.setDate(startDate.getDate() + 1);
    }
    return degreeDays;
  }

  calculateHeatingDegreeDaysForDate(day: Date, localClimatologicalDataMonth: Array<LocalClimatologicalData>, baseHeatingTemperature: number, baseCoolingTemperature: number): DegreeDay {
    let localClimatologicalDataDay: Array<LocalClimatologicalData> = localClimatologicalDataMonth.filter(lcd => {
      return lcd.DATE.getDate() == day.getDate() && isNaN(lcd.HourlyDryBulbTemperature) == false;
    });

    let minutesPerDay: number = 1440;
    let coolingDegreeDays: number = 0;
    let heatingDegreeDays: number = 0;
    for (let i = 0; i < localClimatologicalDataDay.length; i++) {
      if (localClimatologicalDataDay[i].HourlyDryBulbTemperature < baseHeatingTemperature) {
        let previousDate: Date;
        if (i == 0) {
          previousDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
        } else {
          previousDate = new Date(localClimatologicalDataDay[i - 1].DATE)
        }
        let minutesBetween: number = this.getMinutesBetweenDates(previousDate, localClimatologicalDataDay[i].DATE);
        let portionOfDay: number = (minutesBetween / minutesPerDay);
        let degreeDifference: number = baseHeatingTemperature - localClimatologicalDataDay[i].HourlyDryBulbTemperature;
        heatingDegreeDays += (degreeDifference * portionOfDay);
      }

      if (localClimatologicalDataDay[i].HourlyDryBulbTemperature > baseCoolingTemperature) {
        let previousDate: Date;
        if (i == 0) {
          previousDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
        } else {
          previousDate = new Date(localClimatologicalDataDay[i - 1].DATE)
        }
        let minutesBetween: number = this.getMinutesBetweenDates(previousDate, localClimatologicalDataDay[i].DATE);
        let portionOfDay: number = (minutesBetween / minutesPerDay);
        let degreeDifference: number = localClimatologicalDataDay[i].HourlyDryBulbTemperature - baseCoolingTemperature;
        coolingDegreeDays += (degreeDifference * portionOfDay);
      }
    }
    let stationId: string;
    let stationName: string;
    if (localClimatologicalDataDay[0]) {
      stationId = localClimatologicalDataDay[0].stationId;
      stationName = localClimatologicalDataDay[0].STATION;
    }
    return {
      heatingDegreeDays: heatingDegreeDays,
      coolingDegreeDays: coolingDegreeDays,
      date: new Date(day),
      stationId: stationId,
      stationName: stationName
    };
  }

  async calculateHeatingDegreeHoursForDate(day: Date, baseHeatingTemperature: number, baseCoolingTemperature: number, station: WeatherStation): Promise<Array<DetailDegreeDay>> {
    if (!this.stationDataResponse || this.stationDataResponse.station.ID != station.ID || this.stationDataResponse.year != day.getFullYear()) {
      let response: Response = await this.getStationDataResponse(station, day.getFullYear());
      let dataResults: string = await response.text();
      this.stationDataResponse = {
        response: response,
        station: station,
        year: day.getFullYear(),
        dataResults: dataResults
      }
      this.yearHourlyData = this.getStationYearLCDFromResults(station, dataResults);
    }
    let localClimatologicalDataDay: Array<LocalClimatologicalData> = this.yearHourlyData.filter(lcd => {
      return lcd.DATE.getDate() == day.getDate() && lcd.DATE.getMonth() == day.getMonth() && isNaN(lcd.HourlyDryBulbTemperature) == false;
    });

    let results: Array<DetailDegreeDay> = new Array();
    let minutesPerDay: number = 1440;
    for (let i = 0; i < localClimatologicalDataDay.length; i++) {
      let previousDate: Date;
      if (i == 0) {
        previousDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
      } else {
        previousDate = new Date(localClimatologicalDataDay[i - 1].DATE)
      }
      let minutesBetween: number = this.getMinutesBetweenDates(previousDate, localClimatologicalDataDay[i].DATE);
      let portionOfDay: number = (minutesBetween / minutesPerDay);
      if (localClimatologicalDataDay[i].HourlyDryBulbTemperature < baseHeatingTemperature || localClimatologicalDataDay[i].HourlyDryBulbTemperature > baseCoolingTemperature) {

        let heatingDegreeDay: number = 0;
        let heatingDegreeDifference: number = 0;
        let coolingDegreeDay: number = 0;
        let coolingDegreeDifference: number = 0;
        if (localClimatologicalDataDay[i].HourlyDryBulbTemperature < baseHeatingTemperature) {
          heatingDegreeDifference = baseHeatingTemperature - localClimatologicalDataDay[i].HourlyDryBulbTemperature;
          heatingDegreeDay = heatingDegreeDifference * portionOfDay;
        }
        if (localClimatologicalDataDay[i].HourlyDryBulbTemperature > baseCoolingTemperature) {
          coolingDegreeDifference = localClimatologicalDataDay[i].HourlyDryBulbTemperature - baseCoolingTemperature;
          coolingDegreeDay = coolingDegreeDifference * portionOfDay;
        }

        results.push({
          time: localClimatologicalDataDay[i].DATE,
          heatingDegreeDay: heatingDegreeDay,
          heatingDegreeDifference: heatingDegreeDifference,
          coolingDegreeDay: coolingDegreeDay,
          coolingDegreeDifference: coolingDegreeDifference,
          percentOfDay: portionOfDay,
          dryBulbTemp: localClimatologicalDataDay[i].HourlyDryBulbTemperature
        })
      } else {
        results.push({
          time: localClimatologicalDataDay[i].DATE,
          heatingDegreeDay: 0,
          heatingDegreeDifference: 0,
          coolingDegreeDay: 0,
          coolingDegreeDifference: 0,
          percentOfDay: portionOfDay,
          dryBulbTemp: localClimatologicalDataDay[i].HourlyDryBulbTemperature
        })

      }
    }
    return results;
  }



  getCoolingDegreeDays(): number {

    return
  }

  //find weather station closest to zip code
  async getClosestStation(zipCode: string, furthestDistance: number, neededMonth?: { year: number, month: number }): Promise<Array<WeatherStation>> {
    let stationLatLong: { ZIP: string, LAT: string, LNG: string } = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == zipCode });
    if (stationLatLong) {
      let fetchStations = await fetch("https://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.csv");
      let stationsResults = await fetchStations.text();
      stationsResults = stationsResults.replace(/['"]+/g, "");
      let lines = stationsResults.split("\n");
      //HEADERS
      // 0: "USAF"
      // 1: "WBAN"
      // 2: "STATION NAME"
      // 3: "CTRY"
      // 4: "STATE"
      // 5: "ICAO"
      // 6: "LAT"
      // 7: "LON"
      // 8: "ELEV(M)"
      // 9: "BEGIN"
      // 10: "END"
      let closestStations: Array<WeatherStation> = new Array();
      let neededDate: Date;
      if (neededMonth) {
        neededDate = new Date(neededMonth.year, neededMonth.month, 1)
      }
      for (let i = 1; i < lines.length; i++) {
        let currentLine: Array<string> = lines[i].split(",");
        let lat: string = currentLine[6];
        let lon: string = currentLine[7];
        let distance = this.haversine(Number(stationLatLong.LAT), Number(stationLatLong.LNG), Number(lat), Number(lon));
        //add stations within furthestDistance miles
        if (distance <= furthestDistance) {
          //API start/end date format YYYYMMDD
          let begin: string = currentLine[9];
          let beginYear: number = parseFloat(begin.slice(0, 4));
          let beginMonth: number = parseFloat(begin.slice(4, 6));
          let beginDay: number = parseFloat(begin.slice(6, 8));
          //Month 0 indexed
          let startDate: Date = new Date(beginYear, beginMonth - 1, beginDay);
          // let endDate: Date;
          let end: string = currentLine[10];
          let endYear: number = parseFloat(end.slice(0, 4));
          let endMonth: number = parseFloat(end.slice(4, 6));
          let endDay: number = parseFloat(end.slice(6, 8));
          //Month 0 indexed
          let endDate: Date = new Date(endYear, endMonth - 1, endDay);
          let includeStation: boolean = true;
          if (neededDate) {
            if (startDate >= neededDate || endDate <= neededDate) {
              includeStation = false;
            }
          } else if (endDate < new Date(2013, 0, 1)) {
            includeStation = false;
          }
          if (includeStation) {
            let USAF: string = currentLine[0];
            let WBAN: string = currentLine[1];
            let ID: string = USAF + WBAN;
            let station: WeatherStation = {
              name: currentLine[2],
              country: currentLine[3],
              state: currentLine[4],
              lat: lat,
              lon: lon,
              begin: startDate,
              end: endDate,
              USAF: USAF,
              WBAN: WBAN,
              ID: ID,
              distanceFrom: distance
            }
            closestStations.push(station);
          }

        }
      }
      return _.orderBy(closestStations, (station: WeatherStation) => { return station.distanceFrom }, 'asc');
    }
    return [];
  }

  async getClosestStationData(stationsWithinFortyMiles: Array<WeatherStation>, year: number): Promise<{ station: WeatherStation, response: Response, localClimatologicalDataYear: Array<LocalClimatologicalData> }> {
    let response: Response;
    for (let i = 0; i < stationsWithinFortyMiles.length; i++) {
      response = await this.getStationDataResponse(stationsWithinFortyMiles[i], year);
      if (response.ok) {
        let localClimatologicalDataYear: Array<LocalClimatologicalData> = await this.getStationYearLCD(stationsWithinFortyMiles[i], response);
        let checkData: LocalClimatologicalData = localClimatologicalDataYear.find(data => { return isNaN(data.HourlyDryBulbTemperature) == false });
        if (checkData != undefined) {
          return { station: stationsWithinFortyMiles[i], response: response, localClimatologicalDataYear };
        }
      }
    }
    return null;
  }

  async getStationDataResponse(weatherStation: WeatherStation, year: number): Promise<Response> {
    return await fetch("https://www.ncei.noaa.gov/data/local-climatological-data/access/" + year + "/" + weatherStation.ID + ".csv");
  }


  //fetch Local Climatological Data for given station and year
  async getStationYearLCD(weatherStation: WeatherStation, response: Response): Promise<Array<LocalClimatologicalData>> {
    // let fetchData = await fetch("https://www.ncei.noaa.gov/data/local-climatological-data/access/" + year + "/" + weatherStation.ID + ".csv");
    let dataResults = await response.text();
    let parsedData: Array<any> = Papa.parse(dataResults, { header: true }).data;
    let localData: Array<LocalClimatologicalData> = new Array();
    for (let i = 1; i < parsedData.length; i++) {
      let currentLine = parsedData[i];
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
    return localData;
  }

  getStationYearLCDFromResults(weatherStation: WeatherStation, dataResults: string): Array<LocalClimatologicalData> {
    let parsedData: Array<any> = Papa.parse(dataResults, { header: true }).data;
    let localData: Array<LocalClimatologicalData> = new Array();
    for (let i = 1; i < parsedData.length; i++) {
      let currentLine = parsedData[i];
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
    // console.log(localData);
    return localData;
  }



  /// Haversine formula to calculate approximate distances between coordinate pairs
  ///Taken from ONRL-Weather
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

  getMinutesBetweenDates(firstDate: Date, secondDate: Date) {
    let diffMilliseconds = Math.abs(firstDate.getTime() - secondDate.getTime());
    let diffMinutes = this.convertUnitsService.value(diffMilliseconds).from('ms').to('min');
    return diffMinutes;
  }


  async getStationById(stationID: string): Promise<WeatherStation> {
    let fetchStations = await fetch("https://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.csv");
    let stationsResults = await fetchStations.text();
    stationsResults = stationsResults.replace(/['"]+/g, "");
    let lines = stationsResults.split("\n");
    //HEADERS
    // 0: "USAF"
    // 1: "WBAN"
    // 2: "STATION NAME"
    // 3: "CTRY"
    // 4: "STATE"
    // 5: "ICAO"
    // 6: "LAT"
    // 7: "LON"
    // 8: "ELEV(M)"
    // 9: "BEGIN"
    // 10: "END"
    for (let i = 1; i < lines.length; i++) {
      let currentLine: Array<string> = lines[i].split(",");
      let USAF: string = currentLine[0];
      let WBAN: string = currentLine[1];
      let ID: string = USAF + WBAN;
      if (ID == stationID) {
        let lat: string = currentLine[6];
        let lon: string = currentLine[7];

        //API start/end date format YYYYMMDD
        let begin: string = currentLine[9];
        let beginYear: number = parseFloat(begin.slice(0, 4));
        let beginMonth: number = parseFloat(begin.slice(4, 6));
        let beginDay: number = parseFloat(begin.slice(6, 8));
        //Month 0 indexed
        let startDate: Date = new Date(beginYear, beginMonth - 1, beginDay);
        // let endDate: Date;
        let end: string = currentLine[10];
        let endYear: number = parseFloat(end.slice(0, 4));
        let endMonth: number = parseFloat(end.slice(4, 6));
        let endDay: number = parseFloat(end.slice(6, 8));
        //Month 0 indexed
        let endDate: Date = new Date(endYear, endMonth - 1, endDay);

        return {
          name: currentLine[2],
          country: currentLine[3],
          state: currentLine[4],
          lat: lat,
          lon: lon,
          begin: startDate,
          end: endDate,
          USAF: USAF,
          WBAN: WBAN,
          ID: ID,
          distanceFrom: undefined
        }
      }
    }
    return;
  }
}