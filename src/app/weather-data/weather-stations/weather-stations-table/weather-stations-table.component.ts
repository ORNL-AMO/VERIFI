import { Component, Input } from '@angular/core';
import { WeatherStation } from 'src/app/models/degreeDays';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { WeatherDataService } from '../../weather-data.service';

@Component({
    selector: 'app-weather-stations-table',
    templateUrl: './weather-stations-table.component.html',
    styleUrls: ['./weather-stations-table.component.css'],
    standalone: false
})
export class WeatherStationsTableComponent {
  @Input()
  stations: Array<WeatherStation>;

  currentPageNumber: number = 1;
  itemsPerPage: number = 6;
  itemsPerPageSub: Subscription;
  orderDataField: string = 'distanceFrom';
  orderByDirection: string = 'asc';
  constructor(private sharedDataService: SharedDataService, private router: Router,
    private weatherDataService: WeatherDataService) {

  }

  ngOnInit() {
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }

  selectStation(station: WeatherStation) {
    this.weatherDataService.selectedStation = station;
    this.router.navigateByUrl('weather-data/annual-station');
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }
}
