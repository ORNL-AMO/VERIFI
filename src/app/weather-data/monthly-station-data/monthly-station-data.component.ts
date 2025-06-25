import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DetailDegreeDay, WeatherDataSelection, WeatherDataSelectionOption, WeatherDataSelectionOptions, WeatherStation } from 'src/app/models/degreeDays';
import { WeatherDataReading, WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { getDetailedDataForMonth } from '../weatherDataCalculations';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';

@Component({
    selector: 'app-monthly-station-data',
    templateUrl: './monthly-station-data.component.html',
    styleUrls: ['./monthly-station-data.component.css'],
    standalone: false
})
export class MonthlyStationDataComponent {

  weatherStation: WeatherStation;
  selectedMonth: Date;
  heatingTemp: number;
  coolingTemp: number;
  detailedDegreeDays: Array<DetailDegreeDay>;
  hasGapsInData: boolean;
  gapsInDataDate: Date;
  weatherDataSelection: WeatherDataSelection;
  weatherDataSelectionOptions: Array<WeatherDataSelectionOption> = WeatherDataSelectionOptions;
  calculating: boolean = false;
  constructor(private router: Router,
    private weatherDataService: WeatherDataService,
    // private degreeDaysService: DegreeDaysService,
    private toastNotificationService: ToastNotificationsService,
    private activatedRoute: ActivatedRoute
  ) {

  }

  ngOnInit() {
    this.weatherStation = this.weatherDataService.selectedStation;
    this.selectedMonth = this.weatherDataService.selectedMonth;
    if (!this.weatherStation || !this.selectedMonth) {
      this.goToStations();
    } else {
      this.heatingTemp = this.weatherDataService.heatingTemp;
      this.coolingTemp = this.weatherDataService.coolingTemp;
      this.weatherDataSelection = this.weatherDataService.weatherDataSelection;
      this.setDegreeDays();
    }
  }

  async setDegreeDays() {
    this.calculating = true;
    let startDate: Date = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth(), 1);
    let endDate: Date = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + 1, 1);
    let weatherData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.weatherStation.ID, startDate, endDate, ['wet_bulb_temp'])
    if (weatherData != "error") {
      this.detailedDegreeDays = getDetailedDataForMonth(weatherData, this.selectedMonth.getMonth(), this.selectedMonth.getFullYear(), this.heatingTemp, this.coolingTemp, this.weatherStation.ID, this.weatherStation.name);
      // this.detailedDegreeDays = await this.degreeDaysService.getDailyDataFromMonth(this.selectedMonth.getMonth(), this.selectedMonth.getFullYear(), this.heatingTemp, this.coolingTemp, this.weatherStation.ID);
      if (this.detailedDegreeDays) {
        let errorIndex: number = this.detailedDegreeDays.findIndex(degreeDay => {
          return degreeDay.gapInData == true;
        })
        if (errorIndex != -1) {
          this.hasGapsInData = true;
          this.gapsInDataDate = new Date(this.detailedDegreeDays[errorIndex].time);
        } else {
          this.hasGapsInData = undefined;
          this.gapsInDataDate = undefined;
        }
      }
    }else{
      this.toastNotificationService.weatherDataErrorToast();
    }
    this.calculating = false;
  }

  setSelectedMonth(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.selectedMonth = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
  }

  goToStations() {
    this.router.navigate(['../stations'], { relativeTo: this.activatedRoute });
  }

  goToAnnualData() {
    this.router.navigate(['../annual-station'], { relativeTo: this.activatedRoute });
  }

  async setHeatingBaseTemp() {
    this.weatherDataService.heatingTemp = this.heatingTemp;
    await this.setDegreeDays();
  }

  async setCoolingBaseTemp() {
    this.weatherDataService.coolingTemp = this.coolingTemp;
    await this.setDegreeDays();
  }

  showApplyToFacility() {
    this.weatherDataService.applyToFacility.next(true);
  }

  setWeatherDataOption() {
    this.weatherDataService.weatherDataSelection = this.weatherDataSelection;
  }
}
