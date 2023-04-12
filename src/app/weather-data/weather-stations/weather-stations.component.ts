import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { IdbAccount } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherDataService } from '../weather-data.service';

@Component({
  selector: 'app-weather-stations',
  templateUrl: './weather-stations.component.html',
  styleUrls: ['./weather-stations.component.css']
})
export class WeatherStationsComponent {

  zipCode: string;
  furthestDistance: number = 150;
  stations: Array<WeatherStation> = [];
  constructor(private accountDbService: AccountdbService, private degreeDaysService: DegreeDaysService,
    private weatherDataService: WeatherDataService) {

  }

  ngOnInit() {
    if (!this.weatherDataService.zipCode) {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.zipCode = selectedAccount.zip;
    } else {
      this.zipCode = this.weatherDataService.zipCode;
    }
    this.setStations();
  }

  setStations() {
    this.weatherDataService.zipCode = this.zipCode;
    this.degreeDaysService.getClosestStation(this.zipCode, this.furthestDistance).then(stations => {
      this.stations = stations;
    });
  }
}
