import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';

@Component({
  selector: 'app-monthly-station-data',
  templateUrl: './monthly-station-data.component.html',
  styleUrls: ['./monthly-station-data.component.css']
})
export class MonthlyStationDataComponent {

  weatherStation: WeatherStation;
  selectedMonth: Date;
  degreeDays: Array<DegreeDay>;
  heatingTemp: number;
  coolingTemp: number;
  constructor(private router: Router, private degreeDaysService: DegreeDaysService,
    private weatherDataService: WeatherDataService) {

  }

  ngOnInit() {
    this.weatherStation = this.weatherDataService.selectedStation;
    this.selectedMonth = this.weatherDataService.selectedMonth;
    if (!this.weatherStation || !this.selectedMonth) {
      this.router.navigateByUrl('weather-data/stations');
    } else {
      this.heatingTemp = this.weatherDataService.heatingTemp;
      this.coolingTemp = this.weatherDataService.coolingTemp;
      this.setDegreeDays();
    }
  }

  async setDegreeDays() {
    this.degreeDays = await this.degreeDaysService.getDailyDataFromMonth(this.selectedMonth.getMonth(), this.selectedMonth.getFullYear(), this.heatingTemp, this.coolingTemp, this.weatherStation);
  }

  setSelectedMonth(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.selectedMonth = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
  }

  goToStations() {
    this.router.navigateByUrl('weather-data/stations');
  }

  goToAnnualData() {
    this.router.navigateByUrl('weather-data/annual-station');
  }
}
