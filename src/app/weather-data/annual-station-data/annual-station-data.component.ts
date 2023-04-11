import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import * as _ from 'lodash';
import { WeatherDataService } from '../weather-data.service';

@Component({
  selector: 'app-annual-station-data',
  templateUrl: './annual-station-data.component.html',
  styleUrls: ['./annual-station-data.component.css']
})
export class AnnualStationDataComponent {

  weatherStation: WeatherStation;
  years: Array<number>;
  selectedYear: number;
  heatingTemp: number;
  coolingTemp: number;
  degreeDays: Array<DegreeDay>;
  yearSummaryData: Array<{ date: Date, heatingDegreeDays: number, coolingDegreeDays: number }>;
  constructor(private router: Router, private degreeDaysService: DegreeDaysService,
    private weatherDataService: WeatherDataService) {

  }

  ngOnInit() {
    this.weatherStation = this.weatherDataService.selectedStation;
    if (!this.weatherStation) {
      this.router.navigateByUrl('weather-data/stations');
    }
    this.setYears();
    this.selectedYear = this.weatherDataService.selectedYear;
    this.heatingTemp = this.weatherDataService.heatingTemp;
    this.coolingTemp = this.weatherDataService.coolingTemp;
    this.setDegreeDays();
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
    let end: Date = new Date(this.weatherStation.end);
    while (this.weatherStation.begin < end) {
      this.years.push(end.getFullYear());
      end.setFullYear(end.getFullYear() - 1);
    }
  }

  async setDegreeDays() {
    if (this.selectedYear && this.heatingTemp) {
      this.degreeDays = await this.degreeDaysService.getMonthlyDataFromYear(this.selectedYear, this.heatingTemp, this.coolingTemp, this.weatherStation);
      this.setYearSummaryData();
    } else {
      this.degreeDays = undefined;
      this.yearSummaryData = undefined;
    }
  }

  setYearSummaryData() {
    if (this.degreeDays) {
      this.yearSummaryData = new Array();
      let startDate: Date = new Date(this.selectedYear, 0, 1);
      let endDate: Date = new Date(this.selectedYear + 1, 0, 1);
      while (startDate < endDate) {
        let monthData: Array<DegreeDay> = this.degreeDays.filter(day => {
          return day.date.getMonth() == startDate.getMonth();
        });
        let totalHeatingDegreeDays: number = _.sumBy(monthData, 'heatingDegreeDays');
        let totalCoolingDegreeDays: number = _.sumBy(monthData, 'coolingDegreeDays');
        this.yearSummaryData.push({
          date: new Date(startDate),
          heatingDegreeDays: totalHeatingDegreeDays,
          coolingDegreeDays: totalCoolingDegreeDays
        });
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
  }

  goToStations() {
    this.router.navigateByUrl('weather-data/stations');
  }
}
