import { Injectable } from '@angular/core';
import { WeatherDataSelection, WeatherStation } from '../models/degreeDays';
import { BehaviorSubject } from 'rxjs';
import { IdbFacility } from '../models/idb';

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
  coolingTemp: number = 70;
  zipCode: string = "37830";

  applyToFacility: BehaviorSubject<boolean>;
  selectedFacility: IdbFacility;
  weatherDataSelection: WeatherDataSelection = 'degreeDays';
  constructor() {
    this.applyToFacility = new BehaviorSubject<boolean>(false);
  }
}
