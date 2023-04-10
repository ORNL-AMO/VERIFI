import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-annual-station-data',
  templateUrl: './annual-station-data.component.html',
  styleUrls: ['./annual-station-data.component.css']
})
export class AnnualStationDataComponent {

  weatherStation: WeatherStation;
  years: Array<number>;
  selectedYear: number;
  baseTemperature: number;
  degreeDays: Array<DegreeDay>;
  yearSummaryData: Array<{ date: Date, amount: number }>;
  constructor(private activatedRoute: ActivatedRoute, private degreeDaysService: DegreeDaysService) {

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let id: string = params['id'];
      console.log(id);
      this.setStation(id);
    });
  }


  async setStation(id: string) {
    this.weatherStation = await this.degreeDaysService.getStationById(id);
    if (this.weatherStation) {
      console.log(this.weatherStation);
      this.setYears();
    }
  }

  setYears() {
    this.years = new Array();
    let start: Date = new Date(this.weatherStation.begin);
    while (start < this.weatherStation.end) {
      this.years.push(start.getFullYear());
      start.setFullYear(start.getFullYear() + 1);
    }
  }

  async setDegreeDays() {
    if (this.selectedYear && this.baseTemperature) {
      this.degreeDays = await this.degreeDaysService.getMonthlyDataFromYear(this.selectedYear, this.baseTemperature, this.weatherStation);
      this.setYearSummaryData();
    } else {
      this.degreeDays = undefined;
      this.yearSummaryData = undefined;
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
