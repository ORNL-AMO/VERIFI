import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { IdbFacility } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-weather-stations-table',
  templateUrl: './weather-stations-table.component.html',
  styleUrls: ['./weather-stations-table.component.css']
})
export class WeatherStationsTableComponent {

  stations: Array<WeatherStation> = [];

  currentPageNumber: number = 1;
  itemsPerPage: number = 6;
  itemsPerPageSub: Subscription;
  constructor(private degreeDaysService: DegreeDaysService, private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService, private weatherDataService: WeatherDataService,
    private router: Router) {

  }


  ngOnInit() {
    this.setStations();
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }

  setStations() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.degreeDaysService.getClosestStation(facility.zip, 50).then(stations => {
      this.stations = stations;
    });
  }

  goToStation(station: WeatherStation) {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.zipCode = facility.zip;
    this.weatherDataService.selectedStation = station;
    this.weatherDataService.coolingTemp = facility.coolingBaseTemperature;
    this.weatherDataService.heatingTemp = facility.heatingBaseTemperature;
    this.weatherDataService.selectedYear = station.end.getFullYear() - 1;
    this.router.navigateByUrl('weather-data/annual-station');
  }
}
