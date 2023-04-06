import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import * as _ from 'lodash';
import { DegreeDay, WeatherStation } from 'src/app/models/degreeDays';

@Component({
  selector: 'app-degree-days',
  templateUrl: './degree-days.component.html',
  styleUrls: ['./degree-days.component.css']
})
export class DegreeDaysComponent {
  baseTemperature: number = 65;
  stations: Array<WeatherStation>;
  furthestDistance: number = 40;
  facility: IdbFacility;
  selectedStation: WeatherStation;
  degreeDays: Array<DegreeDay>;
  viewDataAs: 'monthly' | 'daily' | 'hourly' = 'monthly';
  selectedYear: number;
  yearSummaryData: Array<{ date: Date, amount: number }>;

  selectedMonth: Date;
  selectedDay: Date;
  years: Array<number>;

  constructor(private facilityDbService: FacilitydbService, private degreeDaysService: DegreeDaysService) {

  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.setStations();
  }

  setStations() {
    this.degreeDaysService.getClosestStation(this.facility.zip, this.furthestDistance).then(stations => {
      this.stations = stations;
      console.log(this.stations);
      if (!this.selectedStation) {
        this.selectedStation = this.stations[0];
        this.setSelectedStation();
      }
    });
  }

  setSelectedStation() {
    let startDate: Date = new Date(this.selectedStation.begin);
    this.years = new Array();
    while (startDate < this.selectedStation.end) {
      this.years.push(startDate.getFullYear());
      startDate.setFullYear(startDate.getFullYear() + 1);
    }

    if (this.years.includes(this.selectedYear) == false) {
      this.selectedYear = this.years[this.years.length - 1];
    }

    if (!this.selectedMonth || this.selectedMonth < this.selectedStation.begin || this.selectedMonth > this.selectedStation.end) {
      this.selectedMonth = new Date(this.selectedStation.end);
    }

    if (!this.selectedDay || this.selectedDay < this.selectedStation.begin || this.selectedDay > this.selectedStation.end) {
      this.selectedDay = new Date(this.selectedStation.end);
      console.log(this.selectedDay);
    }
  }

  setSelectedMonth(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.selectedMonth = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.clearDegreeDays();
  }

  setSelectedDay(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.selectedDay = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.clearDegreeDays();
  }


  clearDegreeDays() {
    this.degreeDays = [];
    this.yearSummaryData = undefined;
  }

  async setDegreeDays() {
    this.degreeDays = new Array();

    if (this.viewDataAs == 'monthly' && isNaN(this.baseTemperature) == false) {
      this.degreeDays = await this.degreeDaysService.getMonthlyDataFromYear(this.selectedYear, this.baseTemperature, this.selectedStation);
      this.setYearSummaryData();
    }
  }

  setYearSummaryData() {
    this.yearSummaryData = new Array();
    let startDate: Date = new Date(this.selectedYear, 0, 1);
    let endDate: Date = new Date(this.selectedYear + 1, 0, 1);
    while (startDate < endDate) {
      let monthData: Array<DegreeDay> = this.degreeDays.filter(day => {
        return day.date.getMonth() == startDate.getMonth();
      });
      let totalAmount: number = _.sumBy(monthData, 'numberOfDays');
      this.yearSummaryData.push({
        date: new Date(startDate),
        amount: totalAmount
      });
      startDate.setMonth(startDate.getMonth() + 1);
    }
  }
}
