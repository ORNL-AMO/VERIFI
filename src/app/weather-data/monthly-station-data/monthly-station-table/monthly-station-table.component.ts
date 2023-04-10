import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { DegreeDay } from 'src/app/models/degreeDays';
import { WeatherDataService } from '../../weather-data.service';

@Component({
  selector: 'app-monthly-station-table',
  templateUrl: './monthly-station-table.component.html',
  styleUrls: ['./monthly-station-table.component.css']
})
export class MonthlyStationTableComponent {
  @Input()
  degreeDays: Array<DegreeDay>;
  
  constructor(private router: Router, private weatherDataService: WeatherDataService){
  }

  goToDailySummary(date: Date){
    this.weatherDataService.selectedDate = date;
    this.router.navigateByUrl('weather-data/daily-station');
  }
}
