import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DetailDegreeDay, WeatherDataSelection, WeatherDataSelectionOption, WeatherDataSelectionOptions, WeatherStation } from 'src/app/models/degreeDays';
import * as _ from 'lodash';
import { WeatherDataReading, WeatherDataService } from '../weather-data.service';
import { getDegreeDayAmount } from 'src/app/shared/sharedHelperFuntions';
import { getMonthlyDataFromYear } from '../weatherDataCalculations';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';

@Component({
  selector: 'app-annual-station-data',
  templateUrl: './annual-station-data.component.html',
  styleUrls: ['./annual-station-data.component.css'],
  standalone: false
})
export class AnnualStationDataComponent {

  weatherStation: WeatherStation;
  years: Array<number>;
  selectedYear: number;
  heatingTemp: number;
  coolingTemp: number;
  detailedDegreeDays: 'error' | Array<DetailDegreeDay>;
  yearSummaryData: Array<AnnualStationDataSummary>;
  calculating: boolean;
  hasGapsInData: boolean;
  weatherDataSelection: WeatherDataSelection;
  weatherDataSelectionOptions: Array<WeatherDataSelectionOption> = WeatherDataSelectionOptions;
  constructor(private router: Router,
    private weatherDataService: WeatherDataService,
    // private degreeDaysService: DegreeDaysService,
    private toastNotificationService: ToastNotificationsService
  ) {

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
      //ISSUE 1822
      let startDate: Date = new Date(this.selectedYear, 0, 1)
      let endDate: Date = new Date(this.selectedYear + 1, 0, 1);
      let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.weatherStation.ID, startDate, endDate, ['humidity'])
      if (parsedData != 'error') {
        this.detailedDegreeDays = getMonthlyDataFromYear(parsedData, this.selectedYear, this.heatingTemp, this.coolingTemp, this.weatherStation);
        // this.detailedDegreeDays = await this.degreeDaysService.getMonthlyDataFromYear(this.selectedYear, this.heatingTemp, this.coolingTemp, this.weatherStation);
        this.setYearSummaryData();
      }else{
        this.yearSummaryData = [];
        this.toastNotificationService.weatherDataErrorToast();
      }
    } else {
      this.detailedDegreeDays = undefined;
      this.yearSummaryData = undefined;
    }
    this.calculating = false;
  }

  setYearSummaryData() {
    let hasGapsInData: boolean = false;
    if (this.detailedDegreeDays && this.detailedDegreeDays != 'error') {
      this.yearSummaryData = new Array();
      let startDate: Date = new Date(this.selectedYear, 0, 1);
      let endDate: Date = new Date(this.selectedYear + 1, 0, 1);
      while (startDate < endDate) {
        let monthData: Array<DetailDegreeDay> = this.detailedDegreeDays.filter(day => {
          return day.time.getMonth() == startDate.getMonth();
        });
        let totalHeatingDegreeDays: number = getDegreeDayAmount(monthData, 'HDD');
        let totalCoolingDegreeDays: number = getDegreeDayAmount(monthData, 'CDD');
        let relativeHumidity: number = getDegreeDayAmount(monthData, 'relativeHumidity');
        let dryBulbTemp: number = getDegreeDayAmount(monthData, 'dryBulbTemp');
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
          relativeHumidity: relativeHumidity,
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