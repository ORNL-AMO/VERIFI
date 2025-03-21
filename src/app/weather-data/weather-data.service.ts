import { Injectable } from '@angular/core';
import { DetailDegreeDay, WeatherDataSelection, WeatherStation } from '../models/degreeDays';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { IdbFacility } from '../models/idbModels/facility';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getDetailedDataForMonth } from './weatherDataCalculations';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WeatherDataService {

  selectedStation: WeatherStation = {
    ID: "72427053868",
    USAF: "724270",
    WBAN: "53868",
    begin: new Date('Sun Aug 01 2010 00:00:00 GMT-0500 (Central Daylight Time)'),
    country: "US",
    distanceFrom: 1.6558680580650613,
    end: new Date('Sun Apr 09 2023 00:00:00 GMT-0500 (Central Daylight Time)'),
    lat: "+36.023",
    lon: "-084.234",
    name: "OAK RIDGE",
    state: "TN",
    ratingPercent: 0
  };
  selectedYear: number = 2022;
  selectedMonth: Date = new Date(2022, 6, 8);
  selectedDate: Date = new Date(2022, 6, 8);
  heatingTemp: number = 60;
  coolingTemp: number = 60;
  zipCode: string = "37830";

  applyToFacility: BehaviorSubject<boolean>;
  selectedFacility: IdbFacility;
  weatherDataSelection: WeatherDataSelection = 'degreeDays';

  requestHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
    // 'Access-Control-Allow-Origin': 'https://lcd.ornl.gov',
    // 'Access-Control-Allow-Headers': 'Content-Type',
    // 'Access-Control-Allow-Methods': 'POST'
  });

  constructor(private httpClient: HttpClient) {
    this.applyToFacility = new BehaviorSubject<boolean>(false);
  }


  getStationsAPI(zipCode: string, distance: number): Observable<any> {
    let currentDate: Date = new Date();
    let data = {
      "zip": zipCode,
      "radial_distance": distance,
      "start_date": "2013-03-01",
      "end_date": currentDate.getFullYear() + '-' + currentDate.getMonth() + '-' + currentDate.getDate()
    };
    let httpOptions = {
      responseType: 'text' as const,
      headers: this.requestHeaders
    };

    return this.httpClient.post(environment.weatherApi + '/stations', data, httpOptions);
  }

  async getStations(zipCode: string, distance: number): Promise<Array<WeatherStation>> {
    let apiData: string = await firstValueFrom(this.getStationsAPI(zipCode, distance));
    let stations: Array<WeatherStation> = JSON.parse(apiData).stations.map(station => {
      return getWeatherStation(station)
    });
    return stations;
  }

  getStationAPI(stationId: string): Observable<any> {
    let httpOptions = {
      responseType: 'text' as const,
      headers: this.requestHeaders
    };
    return this.httpClient.post(environment.weatherApi + '/station/' + stationId, {}, httpOptions);
  }

  async getStation(stationId: string): Promise<WeatherStation | 'error'> {
    try {
      let apiData: string = await firstValueFrom(this.getStationAPI(stationId));
      let station: WeatherStation = getWeatherStation(JSON.parse(apiData));
      station.ID = stationId;
      return station;
    } catch (err) {
      return 'error'
    }
  }


  async getHourlyData(stationId: string, startDate: Date, endDate: Date, parameters: Array<WeatherDataParams>): Promise<Array<WeatherDataReading> | 'error'> {
    try {
      let apiData: string = await firstValueFrom(this.getHourlyDataAPI(stationId, startDate, endDate, parameters));
      let parsedData: Array<WeatherDataReading> = JSON.parse(apiData).hourly_data;
      return parsedData;
    } catch (err) {
      console.log(err)
      return 'error';
    }
  }


  getHourlyDataAPI(stationId: string, startDate: Date, endDate: Date, parameters: Array<WeatherDataParams>): Observable<string> {
    let monthAfterEndDate: Date = new Date(endDate);
    monthAfterEndDate.setMonth(monthAfterEndDate.getMonth() + 1);
    let data = {
      "station_id": stationId,
      "start_date": getWeatherDataDate(startDate),
      "end_date": getWeatherDataDate(monthAfterEndDate),
      "parameters": ['dry_bulb_temp', 'humidity', 'dew_point_temp', 'wet_bulb_temp', 'pressure', 'precipitation', 'wind_speed']
    };
    let httpOptions = {
      responseType: 'text' as const,
      headers: this.requestHeaders
    };
    return this.httpClient.post(environment.weatherApi + '/data', data, httpOptions);
  }


  async getDegreeDaysForMonth(entryDate: Date, stationId: string, weatherStationName: string, heatingBaseTemperature: number, coolingBaseTemperature: number): Promise<Array<DetailDegreeDay> | "error"> {
    let startDate: Date = new Date(entryDate.getFullYear(), entryDate.getMonth() - 1, 1);
    let endDate: Date = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 1);
    let parsedData: Array<WeatherDataReading> | "error" = await this.getHourlyData(stationId, startDate, endDate, ['humidity'])
    if (parsedData != "error") {
      let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, entryDate.getMonth(), entryDate.getFullYear(), heatingBaseTemperature, coolingBaseTemperature, stationId, weatherStationName);
      return degreeDays;
    } else {
      return "error"
    }
  }
}

export function getWeatherDataDate(date: Date): string {
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}


export type WeatherDataParams = 'dry_bulb_temp' | 'humidity' | 'dew_point_temp' | 'wet_bulb_temp' | 'pressure' | 'precipitation' | 'wind_speed';

export function getWeatherStation(response: WeatherStationResponse): WeatherStation {
  return {
    name: response.name,
    country: undefined,
    state: response.state,
    lat: response.lat,
    lon: response.lon,
    begin: new Date(response.data_begin_date),
    end: new Date(response.data_end_date),
    USAF: undefined,
    WBAN: undefined,
    ID: response.station_id,
    distanceFrom: response.distance,
    ratingPercent: response.rating_percent
  }
}

export interface WeatherStationResponse {
  "station_id": string,
  "name": string,
  "data_begin_date": string,
  "data_end_date": string,
  "distance": number,
  "rating_percent": number,
  "lat": string,
  "lon": string,
  "state": string
}

export interface WeatherDataReading {
  "time": Date,
  'dry_bulb_temp': number,
  'humidity': number,
  'dew_point_temp': number,
  'wet_bulb_temp': number,
  'pressure': number,
  'precipitation': number,
  'wind_speed': number
}