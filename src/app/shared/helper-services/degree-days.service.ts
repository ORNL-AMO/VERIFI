import { Injectable } from '@angular/core';
import { EGridService } from './e-grid.service';
import * as _ from 'lodash';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { DegreeDay, LocalClimatologicalData, WeatherStation } from 'src/app/models/degreeDays';
@Injectable({
  providedIn: 'root'
})
export class DegreeDaysService {

  stationDataResponse: { station: WeatherStation, response: Response, year: number, dataResults: string };
  yearHourlyData: Array<LocalClimatologicalData>;
  constructor(private eGridService: EGridService, private convertUnitsService: ConvertUnitsService) { }

  async getHeatingDegreeDays(zipCode: string, month: number, year: number, baseTemperature: number): Promise<Array<DegreeDay>> {
    console.log('get');
    let stationsWithinFortyMiles: Array<WeatherStation> = await this.getClosestStation(zipCode, 40, { year: year, month: month });
    // stationsWithinFortyMiles = ;
    // console.log(stationsWithinFortyMiles);
    let stationDataResponse: { station: WeatherStation, response: Response } = await this.getClosestStationData(stationsWithinFortyMiles, year);
    // console.log(stationDataResponse.station.name);
    let localClimatologicalDataYear: Array<LocalClimatologicalData> = await this.getStationYearLCD(stationDataResponse.station, stationDataResponse.response);
    // console.log('Hours per year: ' + localClimatologicalDataYear.length)
    let localClimatologicalDataMonth: Array<LocalClimatologicalData> = localClimatologicalDataYear.filter(lcd => {
      return lcd.DATE.getMonth() == month;
    });
    // console.log(localClimatologicalDataMonth);
    let startDate: Date = new Date(year, month, 1);
    let endDate: Date = new Date(year, month + 1, 1);
    let degreeDays: Array<DegreeDay> = new Array();
    while (startDate < endDate) {
      let degreeDay: DegreeDay = this.calculateHeatingDegreeDaysForDate(startDate, localClimatologicalDataMonth, baseTemperature);
      degreeDays.push(degreeDay);
      startDate.setDate(startDate.getDate() + 1);
    }
    console.log('DONE');
    return degreeDays;
  }


  async getDailyDataFromMonth(month: number, year: number, baseTemperature: number, station: WeatherStation): Promise<Array<DegreeDay>> {
    console.log('getMonthlyDataFromYear');
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
      let degreeDay: DegreeDay = this.calculateHeatingDegreeDaysForDate(startDate, localClimatologicalDataMonth, baseTemperature);
      degreeDays.push(degreeDay);
      startDate.setDate(startDate.getDate() + 1);
    }
    console.log('DONE');
    return degreeDays;
  }

  async getMonthlyDataFromYear(year: number, baseTemperature: number, station: WeatherStation): Promise<Array<DegreeDay>> {
    console.log('getMonthlyDataFromYear');
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
      let degreeDay: DegreeDay = this.calculateHeatingDegreeDaysForDate(startDate, localClimatologicalDataMonth, baseTemperature);
      degreeDays.push(degreeDay);
      startDate.setDate(startDate.getDate() + 1);
    }
    console.log('DONE');
    return degreeDays;
  }

  calculateHeatingDegreeDaysForDate(day: Date, localClimatologicalDataMonth: Array<LocalClimatologicalData>, baseTemperature: number): DegreeDay {
    let localClimatologicalDataDay: Array<LocalClimatologicalData> = localClimatologicalDataMonth.filter(lcd => {
      return lcd.DATE.getDate() == day.getDate();
    });

    let minutesPerDay: number = 1440;
    let degreeDays: number = 0;
    for (let i = 0; i < localClimatologicalDataDay.length; i++) {
      if (localClimatologicalDataDay[i].HourlyDryBulbTemperature < baseTemperature) {
        let previousDate: Date;
        if (i == 0) {
          previousDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
        } else {
          previousDate = new Date(localClimatologicalDataDay[i - 1].DATE)
        }
        let minutesBetween: number = this.getMinutesBetweenDates(previousDate, localClimatologicalDataDay[i].DATE);
        let portionOfDay: number = (minutesBetween / minutesPerDay);
        let degreeDifference: number = baseTemperature - localClimatologicalDataDay[i].HourlyDryBulbTemperature;
        degreeDays += (degreeDifference * portionOfDay);
      }
    }
    return {
      numberOfDays: degreeDays,
      date: new Date(day),
      stationId: localClimatologicalDataDay[0].STATION,
      stationName: localClimatologicalDataDay[0].NAME
    };
  }

  async calculateHeatingDegreeHoursForDate(day: Date, baseTemperature: number, station: WeatherStation): Promise<Array<{ time: Date, degreeDays: number, dryBulbTemp: number, percentOfDay: number, degreeDifference: number }>> {
    console.log('calculateHeatingDegreeHoursForDate');
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
      return lcd.DATE.getDate() == day.getDate() && lcd.DATE.getMonth() == day.getMonth();
    });

    let results: Array<{ time: Date, degreeDays: number, dryBulbTemp: number, percentOfDay: number, degreeDifference: number }> = new Array();
    let minutesPerDay: number = 1440;
    for (let i = 0; i < localClimatologicalDataDay.length; i++) {
      if (localClimatologicalDataDay[i].HourlyDryBulbTemperature < baseTemperature) {
        let previousDate: Date;
        if (i == 0) {
          previousDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
        } else {
          previousDate = new Date(localClimatologicalDataDay[i - 1].DATE)
        }
        let minutesBetween: number = this.getMinutesBetweenDates(previousDate, localClimatologicalDataDay[i].DATE);
        let portionOfDay: number = (minutesBetween / minutesPerDay);
        let degreeDifference: number = baseTemperature - localClimatologicalDataDay[i].HourlyDryBulbTemperature;
        results.push({
          time: localClimatologicalDataDay[i].DATE,
          degreeDifference: degreeDifference,
          degreeDays: (degreeDifference * portionOfDay),
          percentOfDay: portionOfDay,
          dryBulbTemp: localClimatologicalDataDay[i].HourlyDryBulbTemperature
        })
      } else {
        results.push({
          time: localClimatologicalDataDay[i].DATE,
          degreeDifference: 0,
          degreeDays: 0,
          percentOfDay: 0,
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

  async getClosestStationData(stationsWithinFortyMiles: Array<WeatherStation>, year: number): Promise<{ station: WeatherStation, response: Response }> {
    let response: Response;
    for (let i = 0; i < stationsWithinFortyMiles.length; i++) {
      response = await this.getStationDataResponse(stationsWithinFortyMiles[i], year);
      if (response.ok) {
        return { station: stationsWithinFortyMiles[i], response: response };
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
    dataResults = dataResults.replace(/['"]+/g, "");
    let dataLines = dataResults.split("\n");
    //TODO: Parse data
    // 0: "STATION"
    // 1: "DATE"
    // 2: "LATITUDE"
    // 3: "LONGITUDE"
    // 4: "ELEVATION"
    // 5: "NAME"
    // 6: "REPORT_TYPE"
    // 7: "SOURCE"
    // 8: "HourlyAltimeterSetting"
    // 9: "HourlyDewPointTemperature"
    // 10: "HourlyDryBulbTemperature"
    // 11: "HourlyPrecipitation"
    // 12: "HourlyPresentWeatherType"
    // 13: "HourlyPressureChange"
    // 14: "HourlyPressureTendency"
    // 15: "HourlyRelativeHumidity"
    // 16: "HourlySkyConditions"
    // 17: "HourlySeaLevelPressure"
    // 18: "HourlyStationPressure"
    // 19: "HourlyVisibility"
    // 20: "HourlyWetBulbTemperature"
    // 21: "HourlyWindDirection"
    // 22: "HourlyWindGustSpeed"
    // 23: "HourlyWindSpeed"
    // 24: "Sunrise"
    // 25: "Sunset"
    // 26: "DailyAverageDewPointTemperature"
    // 27: "DailyAverageDryBulbTemperature"
    // 28: "DailyAverageRelativeHumidity"
    // 29: "DailyAverageSeaLevelPressure"
    // 30: "DailyAverageStationPressure"
    // 31: "DailyAverageWetBulbTemperature"
    // 32: "DailyAverageWindSpeed"
    // 33: "DailyCoolingDegreeDays"
    // 34: "DailyDepartureFromNormalAverageTemperature"
    // 35: "DailyHeatingDegreeDays"
    // 36: "DailyMaximumDryBulbTemperature"
    // 37: "DailyMinimumDryBulbTemperature"
    // 38: "DailyPeakWindDirection"
    // 39: "DailyPeakWindSpeed"
    // 40: "DailyPrecipitation"
    // 41: "DailySnowDepth"
    // 42: "DailySnowfall"
    // 43: "DailySustainedWindDirection"
    // 44: "DailySustainedWindSpeed"
    // 45: "DailyWeather"
    // 46: "MonthlyAverageRH"
    // 47: "MonthlyDaysWithGT001Precip"
    // 48: "MonthlyDaysWithGT010Precip"
    // 49: "MonthlyDaysWithGT32Temp"
    // 50: "MonthlyDaysWithGT90Temp"
    // 51: "MonthlyDaysWithLT0Temp"
    // 52: "MonthlyDaysWithLT32Temp"
    // 53: "MonthlyDepartureFromNormalAverageTemperature"
    // 54: "MonthlyDepartureFromNormalCoolingDegreeDays"
    // 55: "MonthlyDepartureFromNormalHeatingDegreeDays"
    // 56: "MonthlyDepartureFromNormalMaximumTemperature"
    // 57: "MonthlyDepartureFromNormalMinimumTemperature"
    // 58: "MonthlyDepartureFromNormalPrecipitation"
    // 59: "MonthlyDewpointTemperature"
    // 60: "MonthlyGreatestPrecip"
    // 61: "MonthlyGreatestPrecipDate"
    // 62: "MonthlyGreatestSnowDepth"
    // 63: "MonthlyGreatestSnowDepthDate"
    // 64: "MonthlyGreatestSnowfall"
    // 65: "MonthlyGreatestSnowfallDate"
    // 66: "MonthlyMaxSeaLevelPressureValue"
    // 67: "MonthlyMaxSeaLevelPressureValueDate"
    // 68: "MonthlyMaxSeaLevelPressureValueTime"
    // 69: "MonthlyMaximumTemperature"
    // 70: "MonthlyMeanTemperature"
    // 71: "MonthlyMinSeaLevelPressureValue"
    // 72: "MonthlyMinSeaLevelPressureValueDate"
    // 73: "MonthlyMinSeaLevelPressureValueTime"
    // 74: "MonthlyMinimumTemperature"
    // 75: "MonthlySeaLevelPressure"
    // 76: "MonthlyStationPressure"
    // 77: "MonthlyTotalLiquidPrecipitation"
    // 78: "MonthlyTotalSnowfall"
    // 79: "MonthlyWetBulb"
    // 80: "AWND"
    // 81: "CDSD"
    // 82: "CLDD"
    // 83: "DSNW"
    // 84: "HDSD"
    // 85: "HTDD"
    // 86: "NormalsCoolingDegreeDay"
    // 87: "NormalsHeatingDegreeDay"
    // 88: "ShortDurationEndDate005"
    // 89: "ShortDurationEndDate010"
    // 90: "ShortDurationEndDate015"
    // 91: "ShortDurationEndDate020"
    // 92: "ShortDurationEndDate030"
    // 93: "ShortDurationEndDate045"
    // 94: "ShortDurationEndDate060"
    // 95: "ShortDurationEndDate080"
    // 96: "ShortDurationEndDate100"
    // 97: "ShortDurationEndDate120"
    // 98: "ShortDurationEndDate150"
    // 99: "ShortDurationEndDate180"
    // 100: "ShortDurationPrecipitationValue005"
    // 101: "ShortDurationPrecipitationValue010"
    // 102: "ShortDurationPrecipitationValue015"
    // 103: "ShortDurationPrecipitationValue020"
    // 104: "ShortDurationPrecipitationValue030"
    // 105: "ShortDurationPrecipitationValue045"
    // 106: "ShortDurationPrecipitationValue060"
    // 107: "ShortDurationPrecipitationValue080"
    // 108: "ShortDurationPrecipitationValue100"
    // 109: "ShortDurationPrecipitationValue120"
    // 110: "ShortDurationPrecipitationValue150"
    // 111: "ShortDurationPrecipitationValue180"
    // 112: "REM"
    // 113: "BackupDirection"
    // 114: "BackupDistance"
    // 115: "BackupDistanceUnit"
    // 116: "BackupElements"
    // 117: "BackupElevation"
    // 118: "BackupEquipment"
    // 119: "BackupLatitude"
    // 120: "BackupLongitude"
    // 121: "BackupName"
    // 122: "WindEquipmentChangeDate"
    let localData: Array<LocalClimatologicalData> = new Array();

    for (let i = 1; i < dataLines.length; i++) {
      let currentLine = dataLines[i].split(",");
      let hourData: LocalClimatologicalData = {
        STATION: weatherStation.name,
        DATE: new Date(currentLine[1]),
        LATITUDE: currentLine[2],
        LONGITUDE: currentLine[3],
        ELEVATION: currentLine[4],
        NAME: currentLine[5],
        REPORT_TYPE: currentLine[6],
        SOURCE: currentLine[7],
        HourlyAltimeterSetting: parseFloat(currentLine[8]),
        HourlyDewPointTemperature: parseFloat(currentLine[9]),
        HourlyDryBulbTemperature: parseFloat(currentLine[10]),
        HourlyPrecipitation: parseFloat(currentLine[11]),
        HourlyPresentWeatherType: currentLine[12],
        HourlyPressureChange: parseFloat(currentLine[13]),
        HourlyPressureTendency: parseFloat(currentLine[14]),
        HourlyRelativeHumidity: parseFloat(currentLine[15]),
        HourlySkyConditions: parseFloat(currentLine[16]),
        HourlySeaLevelPressure: parseFloat(currentLine[17]),
        HourlyStationPressure: parseFloat(currentLine[18]),
        HourlyVisibility: parseFloat(currentLine[19]),
        HourlyWetBulbTemperature: parseFloat(currentLine[20]),
        HourlyWindDirection: parseFloat(currentLine[21]),
        HourlyWindGustSpeed: parseFloat(currentLine[22]),
        HourlyWindSpeed: parseFloat(currentLine[23])
      }
      localData.push(hourData);
    }
    return localData;
  }

  getStationYearLCDFromResults(weatherStation: WeatherStation, dataResults: string): Array<LocalClimatologicalData> {
    dataResults = dataResults.replace(/['"]+/g, "");
    let dataLines = dataResults.split("\n");
    let localData: Array<LocalClimatologicalData> = new Array();

    for (let i = 1; i < dataLines.length; i++) {
      let currentLine = dataLines[i].split(",");
      let hourData: LocalClimatologicalData = {
        STATION: weatherStation.name,
        DATE: new Date(currentLine[1]),
        LATITUDE: currentLine[2],
        LONGITUDE: currentLine[3],
        ELEVATION: currentLine[4],
        NAME: currentLine[5],
        REPORT_TYPE: currentLine[6],
        SOURCE: currentLine[7],
        HourlyAltimeterSetting: parseFloat(currentLine[8]),
        HourlyDewPointTemperature: parseFloat(currentLine[9]),
        HourlyDryBulbTemperature: parseFloat(currentLine[10]),
        HourlyPrecipitation: parseFloat(currentLine[11]),
        HourlyPresentWeatherType: currentLine[12],
        HourlyPressureChange: parseFloat(currentLine[13]),
        HourlyPressureTendency: parseFloat(currentLine[14]),
        HourlyRelativeHumidity: parseFloat(currentLine[15]),
        HourlySkyConditions: parseFloat(currentLine[16]),
        HourlySeaLevelPressure: parseFloat(currentLine[17]),
        HourlyStationPressure: parseFloat(currentLine[18]),
        HourlyVisibility: parseFloat(currentLine[19]),
        HourlyWetBulbTemperature: parseFloat(currentLine[20]),
        HourlyWindDirection: parseFloat(currentLine[21]),
        HourlyWindGustSpeed: parseFloat(currentLine[22]),
        HourlyWindSpeed: parseFloat(currentLine[23])
      }
      localData.push(hourData);
    }
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