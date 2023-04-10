import { Component, Input } from '@angular/core';
import { WeatherStation } from 'src/app/models/degreeDays';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-weather-stations-table',
  templateUrl: './weather-stations-table.component.html',
  styleUrls: ['./weather-stations-table.component.css']
})
export class WeatherStationsTableComponent {
  @Input()
  stations: Array<WeatherStation>;

  currentPageNumber: number = 1;
  itemsPerPage: number = 6;
  itemsPerPageSub: Subscription;
  constructor(private sharedDataService: SharedDataService, private router: Router) {

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
    this.router.navigateByUrl('weather-data/annual-station/' + station.ID);
  }

}
