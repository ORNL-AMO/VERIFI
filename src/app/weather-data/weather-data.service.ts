import { Injectable } from '@angular/core';
import { WeatherDataSelection, WeatherStation } from '../models/degreeDays';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbFacility } from '../models/idbModels/facility';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
    state: "TN"
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
  constructor(private httpClient: HttpClient) {
    this.applyToFacility = new BehaviorSubject<boolean>(false);
  }


  getStations(zipCode: string, distance: number): Observable<any> {
    console.log('get!')
    let currentDate: Date = new Date();
    let data = {
      "zip": zipCode,
      "radial_distance": distance,
      "start_date": "2013-03-01",
      "end_date": currentDate.getFullYear() + '-' + currentDate.getMonth() + '-' + currentDate.getDate()
    };

    let httpOptions = {
      responseType: 'text' as const,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.httpClient.post('/api/stations', data, httpOptions);
  }


  getHourlyData(stationId: string, startDate: Date, endDate: Date, parameters: Array<WeatherDataParams>) {
    let data = {
      "station_id": stationId,
      "start_date": getWeatherDataDate(startDate),
      "end_date": getWeatherDataDate(endDate),
      "parameters": ['dry_bulb_temp', 'humidity', 'dew_point_temp', 'wet_bulb_temp', 'pressure', 'precipitation', 'wind_speed']
    };
    console.log(data);
    let httpOptions = {
      responseType: 'text' as const,
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.httpClient.post('/api/data', data, httpOptions);
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
    state: undefined,
    lat: undefined,
    lon: undefined,
    begin: new Date(response.data_begin_date),
    end: new Date(response.data_end_date),
    USAF: undefined,
    WBAN: undefined,
    ID: response.station_id,
    distanceFrom: response.distance
    //ratingPercent
  }
}

export interface WeatherStationResponse {
  "station_id": string,
  "name": string,
  "data_begin_date": string,
  "data_end_date": string,
  "distance": number,
  "rating_percent ": number
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