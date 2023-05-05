import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { WeatherDataService } from '../../weather-data.service';

@Component({
  selector: 'app-annual-station-table',
  templateUrl: './annual-station-table.component.html',
  styleUrls: ['./annual-station-table.component.css']
})
export class AnnualStationTableComponent {
  @Input()
  yearSummaryData: Array<{ date: Date, heatingDegreeDays: number, coolingDegreeDays: number, hasErrors: boolean  }>;
  
  currentPageNumber: number = 1;
  itemsPerPage: number = 10;

  constructor(private weatherDataService: WeatherDataService, private router: Router){

  }

  gotToMonthSummary(date: Date){
    this.weatherDataService.selectedMonth = date;
    this.router.navigateByUrl('weather-data/monthly-station');
  }
}
