import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DetailDegreeDay, WeatherDataSelection, WeatherDataSelectionOption, WeatherDataSelectionOptions, WeatherStation } from 'src/app/models/degreeDays';
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
  detailedDegreeDays: Array<DetailDegreeDay>;
  yearSummaryData: Array<AnnualStationDataSummary>;
  calculating: boolean;
  hasGapsInData: boolean;
  weatherDataSelection: WeatherDataSelection;
  weatherDataSelectionOptions: Array<WeatherDataSelectionOption> = WeatherDataSelectionOptions;
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
    this.weatherDataSelection = this.weatherDataService.weatherDataSelection;
    this.setDegreeDays();
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
    this.calculating = true;
    if (this.selectedYear && this.heatingTemp) {
      this.detailedDegreeDays = await this.degreeDaysService.getMonthlyDataFromYear(this.selectedYear, this.heatingTemp, this.coolingTemp, this.weatherStation);
      this.setYearSummaryData();
    } else {
      this.detailedDegreeDays = undefined;
      this.yearSummaryData = undefined;
    }
    this.calculating = false;
  }

  setYearSummaryData() {
    let hasGapsInData: boolean = false;
    if (this.detailedDegreeDays) {
      this.yearSummaryData = new Array();
      let startDate: Date = new Date(this.selectedYear, 0, 1);
      let endDate: Date = new Date(this.selectedYear + 1, 0, 1);
      while (startDate < endDate) {
        let monthData: Array<DetailDegreeDay> = this.detailedDegreeDays.filter(day => {
          return day.time.getMonth() == startDate.getMonth();
        });
        let totalHeatingDegreeDays: number = _.sumBy(monthData, (detailDegreeDay: DetailDegreeDay) => {
          return detailDegreeDay.heatingDegreeDay
        });
        let totalCoolingDegreeDays: number = _.sumBy(monthData, (detailDegreeDay: DetailDegreeDay) => {
          return detailDegreeDay.coolingDegreeDay
        });
        let averageRelativeHumidity: number = _.meanBy(monthData, (detailDegreeDay: DetailDegreeDay) => {
          return detailDegreeDay.weightedRelativeHumidity
        });
        let dryBulbTemp: number = _.meanBy(monthData, (detailDegreeDay: DetailDegreeDay) => {
          return detailDegreeDay.weightedDryBulbTemp
        });
        let hasErrors: DetailDegreeDay = monthData.find(degreeDay => {
          return degreeDay.gapInData == true
        });
        if (!hasGapsInData) {
          hasGapsInData = hasErrors != undefined;
        }
        this.yearSummaryData.push({
          date: new Date(startDate),
          heatingDegreeDays: totalHeatingDegreeDays,
          coolingDegreeDays: totalCoolingDegreeDays,
          hasErrors: hasErrors != undefined,
          relativeHumidity: averageRelativeHumidity,
          dryBulbTemp: dryBulbTemp
        });
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
    this.hasGapsInData = hasGapsInData;
  }

  goToStations() {
    this.router.navigateByUrl('weather-data/stations');
  }

  async setHeatingBaseTemp() {
    this.weatherDataService.heatingTemp = this.heatingTemp;
    await this.setDegreeDays();
  }

  async setCoolingBaseTemp() {
    this.weatherDataService.coolingTemp = this.coolingTemp;
    await this.setDegreeDays();
  }

  async changeYear() {
    this.weatherDataService.selectedYear = this.selectedYear;
    await this.setDegreeDays();
  }

  showApplyToFacility() {
    this.weatherDataService.applyToFacility.next(true);
  }

  setWeatherDataOption() {
    this.weatherDataService.weatherDataSelection = this.weatherDataSelection;
  }
}


export interface AnnualStationDataSummary { date: Date, heatingDegreeDays: number, coolingDegreeDays: number, hasErrors: boolean, relativeHumidity: number, dryBulbTemp: number }