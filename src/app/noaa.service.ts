import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EGridService } from './shared/helper-services/e-grid.service';
import * as XLSX from 'xlsx';
@Injectable({
  providedIn: 'root'
})
export class NoaaService {

  constructor(private http: HttpClient, private eGridService: EGridService) { }

  async get() {
    console.log('get');
    let hopkinsLatLong = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == '55343' });
    console.log(hopkinsLatLong);
    // console.log(test);

    // let stations = this.getStations();
    let fetchStations = await fetch("https://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.csv");
    let stationsResults = await fetchStations.text();
    stationsResults = stationsResults.replace(/['"]+/g, "");
    let lines = stationsResults.split("\n");
    // let headers = lines[0].split(",");
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
    let closestDistance: number = Infinity;
    let closestStation: {
      name: string,
      country: string,
      state: string,
      lat: string,
      lon: string,
      begin: string,
      end: string,
      USAF: string,
      WBAN: string
    }
    for (let i = 1; i < lines.length; i++) {
      let currentLine: Array<string> = lines[i].split(",");
      let lat: string = currentLine[6];
      let lon: string = currentLine[7];
      let distance = this.Haversine(Number(hopkinsLatLong.LAT), Number(hopkinsLatLong.LNG), Number(lat), Number(lon));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestStation = {
          name: currentLine[2],
          country: currentLine[3],
          state: currentLine[4],
          lat: lat,
          lon: lon,
          begin: currentLine[9],
          end: currentLine[10],
          USAF: currentLine[0],
          WBAN: currentLine[1]
        }
      }
    }
    console.log(closestStation);
    let stationID: string = closestStation.USAF + closestStation.WBAN;
    console.log('FETCH DATA')
    let fetchData = await fetch("https://www.ncei.noaa.gov/data/local-climatological-data/access/2020/" + stationID + ".csv");
    console.log('FETCH DONE');
    let dataResults = await fetchData.text();
    console.log('DATA RESULTS DONE')
    dataResults = dataResults.replace(/['"]+/g, "");
    let dataLines = dataResults.split("\n");
    // console.log(dataLines);
    let headers = dataLines[0].split(",");
    console.log(headers);
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
    // console.log(dataLines.length);
    let currentLine = dataLines[1].split(",");
    // 1: "DATE"
    let dateRaw = currentLine[1];
    console.log(dateRaw);
    let date = new Date(dateRaw);
    console.log(date);
    // 10: "HourlyDryBulbTemperature"
    let hourlyDryBulbTemperature = currentLine[10];
    console.log(hourlyDryBulbTemperature);
    console.log('===');
    // for (let i = 1; i < dataLines.length; i++) {
    //   let currentLine = dataLines[i].split(",");
    //   // 1: "DATE"
    //   let date = currentLine[1];
    //   console.log(date);
    //   // 10: "HourlyDryBulbTemperature"
    //   let hourlyDryBulbTemperature = currentLine[10];
    //   console.log(hourlyDryBulbTemperature);
    //   console.log('===');
    // }
    // console.log(stations);
    // this.http.get('https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND&locationid=ZIP:55343&startdate=2012-12-01&enddate=2012-12-30', {
    //   headers: {
    //     token: 'oVoDDYcOGFgmSylEmaziBViyKTmsGtwV'
    //   }
    // }).subscribe(value => {
    //   console.log(value);
    // })

    // this.http.get('https://www.ncei.noaa.gov/cdo-web/api/v2/stations?datasetid=NORMAL_HLY&limit=999', {
    //   headers: {
    //     token: 'oVoDDYcOGFgmSylEmaziBViyKTmsGtwV'
    //   }
    // }).subscribe(value => {
    //   console.log(value);
    // })

    // this.http.get('https://www.ncei.noaa.gov/cdo-web/api/v2/datatypes?datasetid=NORMAL_HLY&limit=999', {
    //   headers: {
    //     token: 'oVoDDYcOGFgmSylEmaziBViyKTmsGtwV'
    //   }
    // }).subscribe((value: { metadata: any, results: Array<any> }) => {
    //   console.log('RESULTS');
    //   console.log(value);
    // })
  }


  async getStations(): Promise<string> {
    const jsonFile: any = [];
    await fetch("https://www1.ncdc.noaa.gov/pub/data/noaa/isd-history.csv")
      .then((res) => res.text())
      .then((data) => {
        let csv = data;
        //Remove "" that are automatically added
        csv = csv.replace(/['"]+/g, "");

        const lines = csv.split("\n");
        const headers = lines[0].split(",");
        for (let i = 1; i < lines.length; i++) {
          const obj: any = {};
          const currLine = lines[i].split(",");
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currLine[j];
          }
          jsonFile.push(obj);
        }
      });
    console.log(jsonFile)
    return JSON.stringify(jsonFile);
  }

  /// Haversine formula to calculate approximate distances between coordinate pairs
  Haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

}

// GHCND:US1MNHN0081

//Doesn't work...
//datasetid=GSOM
//Cooling degree days = CLDD
//Heating degree days = HTDD

// NORMAL_HLY
// "HLY-TEMP-NORMAL"


//https://www.ncei.noaa.gov/data/local-climatological-data/access/${year}/${stationID}.csv
//stationID=USAF+WBAN