import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DegreeDay, DetailDegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';

@Component({
  selector: 'app-daily-station-data',
  templateUrl: './daily-station-data.component.html',
  styleUrls: ['./daily-station-data.component.css']
})
export class DailyStationDataComponent {

  weatherStation: WeatherStation;
  selectedDate: Date;
  selectedMonth: Date;
  heatingTemp: number;
  coolingTemp: number;
  hourlySummaryData: Array<DetailDegreeDay>;
  constructor(private router: Router, private degreeDaysService: DegreeDaysService,
    private weatherDataService: WeatherDataService) {

  }

  ngOnInit() {
    this.weatherStation = this.weatherDataService.selectedStation;
    this.selectedMonth = this.weatherDataService.selectedMonth;
    this.selectedDate = this.weatherDataService.selectedDate;
    if (!this.weatherStation || !this.selectedDate) {
      this.router.navigateByUrl('weather-data/stations');
    } else {
      this.heatingTemp = this.weatherDataService.heatingTemp;
      this.coolingTemp = this.weatherDataService.coolingTemp;
      this.setDegreeDays()
    }
  }

  async setDegreeDays() {
    this.hourlySummaryData = await this.degreeDaysService.calculateHeatingDegreeHoursForDate(this.selectedDate, this.heatingTemp, this.coolingTemp, this.weatherStation);
  }

  setSelectedDate(eventData: string) {
    //eventData format = yyyy-mm-dd = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.selectedDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, Number(yearMonth[2]));
  }

  goToStations() {
    this.router.navigateByUrl('weather-data/stations');
  }

  goToAnnualData() {
    this.router.navigateByUrl('weather-data/annual-station');
  }

  goToMonthData() {
    this.router.navigateByUrl('weather-data/monthly-station');
  }

  async setHeatingBaseTemp(){
    this.weatherDataService.heatingTemp = this.heatingTemp;
    await this.setDegreeDays();
  }

  async setCoolingBaseTemp(){
    this.weatherDataService.coolingTemp = this.coolingTemp;
    await this.setDegreeDays();
  }
  
  showApplyToFacility() {
    this.weatherDataService.applyToFacility.next(true);
  }
}