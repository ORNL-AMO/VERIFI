import { Injectable } from '@angular/core';
import { WeatherStation } from '../models/degreeDays';

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
  selectedMonth: Date = new Date(2022, 0, 1);
  selectedDate: Date;
  heatingTemp: number = 65;
  coolingTemp: number = 65;
  constructor() { }
}
